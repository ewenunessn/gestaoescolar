package schools

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/ewenunessn/gestaoescolar/backend-go/internal/database"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type Repository struct {
	db database.DBTX
}

func NewRepository(db database.DBTX) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, input CreateSchoolInput) (School, error) {
	const query = `
		INSERT INTO schools (
			tenant_id, name, code, address, city, maps_address,
			phone, email, manager_name, administration_type, active
		)
		VALUES (current_setting('app.tenant_id', true)::uuid, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, name, code, address, city, maps_address, phone, email,
			manager_name, administration_type, active, created_at, updated_at
	`

	db := database.ExecutorFromContext(ctx, r.db)
	school, err := scanSchool(db.QueryRow(ctx, query,
		input.Name,
		input.Code,
		input.Address,
		input.City,
		input.MapsAddress,
		input.Phone,
		input.Email,
		input.ManagerName,
		input.AdministrationType,
		input.Active,
	))
	if err != nil {
		return School{}, mapPostgresError(err)
	}
	return school, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (School, error) {
	const query = `
		SELECT id, name, code, address, city, maps_address, phone, email,
			manager_name, administration_type, active, created_at, updated_at
		FROM schools
		WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND id = $1
	`

	db := database.ExecutorFromContext(ctx, r.db)
	school, err := scanSchool(db.QueryRow(ctx, query, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return School{}, ErrNotFound
	}
	if err != nil {
		return School{}, err
	}
	return school, nil
}

func (r *Repository) List(ctx context.Context, input ListSchoolsQuery) (ListSchoolsResult, error) {
	conditions := []string{"s.tenant_id = current_setting('app.tenant_id', true)::uuid"}
	args := make([]any, 0, 4)

	if input.Active != nil {
		args = append(args, *input.Active)
		conditions = append(conditions, fmt.Sprintf("s.active = $%d", len(args)))
	}
	if input.Search != "" {
		args = append(args, "%"+input.Search+"%")
		conditions = append(conditions, fmt.Sprintf("(s.name ILIKE $%d OR s.code ILIKE $%d OR s.city ILIKE $%d)", len(args), len(args), len(args)))
	}
	if input.Cursor != nil {
		args = append(args, *input.Cursor)
		conditions = append(conditions, fmt.Sprintf("s.id > $%d", len(args)))
	}

	limit := input.Limit
	args = append(args, limit+1)

	query := `
		SELECT s.id, s.name, s.code, s.address, s.city, s.maps_address, s.phone, s.email,
			s.manager_name, s.administration_type,
			COALESCE(SUM(sem.student_count) FILTER (WHERE sem.active), 0)::int AS total_students,
			COALESCE(
				array_remove(array_agg(em.name ORDER BY em.name) FILTER (WHERE sem.active), NULL),
				ARRAY[]::text[]
			) AS modalities,
			s.active, s.created_at, s.updated_at
		FROM schools s
		LEFT JOIN school_education_modalities sem
			ON sem.tenant_id = s.tenant_id
			AND sem.school_id = s.id
		LEFT JOIN education_modalities em
			ON em.tenant_id = sem.tenant_id
			AND em.id = sem.education_modality_id
	`
	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += fmt.Sprintf(`
		GROUP BY s.id, s.name, s.code, s.address, s.city, s.maps_address, s.phone, s.email,
			s.manager_name, s.administration_type, s.active, s.created_at, s.updated_at
		ORDER BY s.id ASC LIMIT $%d
	`, len(args))

	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return ListSchoolsResult{}, err
	}
	defer rows.Close()

	schools := make([]School, 0, limit)
	for rows.Next() {
		school, err := scanSchoolWithSummary(rows)
		if err != nil {
			return ListSchoolsResult{}, err
		}
		schools = append(schools, school)
	}
	if err := rows.Err(); err != nil {
		return ListSchoolsResult{}, err
	}

	var nextCursor *int64
	if len(schools) > limit {
		cursor := schools[limit-1].ID
		nextCursor = &cursor
		schools = schools[:limit]
	}

	return ListSchoolsResult{
		Schools:    schools,
		NextCursor: nextCursor,
	}, nil
}

func (r *Repository) Update(ctx context.Context, id int64, input UpdateSchoolInput) (School, error) {
	setClauses := make([]string, 0, 10)
	args := make([]any, 0, 11)

	addField := func(column string, value any) {
		args = append(args, value)
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", column, len(args)))
	}

	if input.Name != nil {
		addField("name", *input.Name)
	}
	if input.Code != nil {
		addField("code", *input.Code)
	}
	if input.Address != nil {
		addField("address", *input.Address)
	}
	if input.City != nil {
		addField("city", *input.City)
	}
	if input.MapsAddress != nil {
		addField("maps_address", *input.MapsAddress)
	}
	if input.Phone != nil {
		addField("phone", *input.Phone)
	}
	if input.Email != nil {
		addField("email", *input.Email)
	}
	if input.ManagerName != nil {
		addField("manager_name", *input.ManagerName)
	}
	if input.AdministrationType != nil {
		addField("administration_type", *input.AdministrationType)
	}
	if input.Active != nil {
		addField("active", *input.Active)
	}

	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE schools
		SET %s, updated_at = now()
		WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND id = $%d
		RETURNING id, name, code, address, city, maps_address, phone, email,
			manager_name, administration_type, active, created_at, updated_at
	`, strings.Join(setClauses, ", "), len(args))

	db := database.ExecutorFromContext(ctx, r.db)
	school, err := scanSchool(db.QueryRow(ctx, query, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return School{}, ErrNotFound
	}
	if err != nil {
		return School{}, mapPostgresError(err)
	}
	return school, nil
}

func (r *Repository) SoftDelete(ctx context.Context, id int64) (School, error) {
	const query = `
		UPDATE schools
		SET active = false, updated_at = now()
		WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND id = $1
		RETURNING id, name, code, address, city, maps_address, phone, email,
			manager_name, administration_type, active, created_at, updated_at
	`

	db := database.ExecutorFromContext(ctx, r.db)
	school, err := scanSchool(db.QueryRow(ctx, query, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return School{}, ErrNotFound
	}
	if err != nil {
		return School{}, err
	}
	return school, nil
}

type rowScanner interface {
	Scan(...any) error
}

func scanSchool(row rowScanner) (School, error) {
	var school School
	if err := row.Scan(
		&school.ID,
		&school.Name,
		&school.Code,
		&school.Address,
		&school.City,
		&school.MapsAddress,
		&school.Phone,
		&school.Email,
		&school.ManagerName,
		&school.AdministrationType,
		&school.Active,
		&school.CreatedAt,
		&school.UpdatedAt,
	); err != nil {
		return School{}, err
	}
	return school, nil
}

func scanSchoolWithSummary(row rowScanner) (School, error) {
	var school School
	if err := row.Scan(
		&school.ID,
		&school.Name,
		&school.Code,
		&school.Address,
		&school.City,
		&school.MapsAddress,
		&school.Phone,
		&school.Email,
		&school.ManagerName,
		&school.AdministrationType,
		&school.TotalStudents,
		&school.Modalities,
		&school.Active,
		&school.CreatedAt,
		&school.UpdatedAt,
	); err != nil {
		return School{}, err
	}
	if school.Modalities == nil {
		school.Modalities = []string{}
	}
	return school, nil
}

func mapPostgresError(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrConflict
	}
	return err
}
