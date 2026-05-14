package schoolmodalities

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

func (r *Repository) Create(ctx context.Context, input CreateInput) (SchoolEducationModality, error) {
	const query = `
		INSERT INTO school_education_modalities (
			tenant_id, school_id, education_modality_id, student_count, active
		)
		VALUES (current_setting('app.tenant_id', true)::uuid, $1, $2, $3, $4)
		RETURNING id, school_id, education_modality_id,
			(SELECT name FROM education_modalities WHERE tenant_id = school_education_modalities.tenant_id AND id = school_education_modalities.education_modality_id),
			student_count, active, created_at, updated_at
	`
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, query, input.SchoolID, input.EducationModalityID, input.StudentCount, input.Active))
	if err != nil {
		return SchoolEducationModality{}, mapPostgresError(err)
	}
	return item, nil
}

func (r *Repository) ListBySchool(ctx context.Context, schoolID int64, query ListQuery) (ListResult, error) {
	const sql = `
		SELECT sem.id, sem.school_id, sem.education_modality_id, em.name,
			sem.student_count, sem.active, sem.created_at, sem.updated_at
		FROM school_education_modalities sem
		JOIN education_modalities em ON em.tenant_id = sem.tenant_id AND em.id = sem.education_modality_id
		WHERE sem.tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND sem.school_id = $1
		  AND ($2::bigint IS NULL OR sem.id > $2)
		ORDER BY sem.id
		LIMIT $3
	`
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, sql, schoolID, query.Cursor, query.Limit+1)
	if err != nil {
		return ListResult{}, err
	}
	defer rows.Close()

	items := []SchoolEducationModality{}
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return ListResult{}, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return ListResult{}, err
	}
	var nextCursor *int64
	if len(items) > query.Limit {
		cursor := items[query.Limit-1].ID
		nextCursor = &cursor
		items = items[:query.Limit]
	}
	return ListResult{Items: items, NextCursor: nextCursor}, nil
}

func (r *Repository) Update(ctx context.Context, schoolID int64, id int64, input UpdateInput) (SchoolEducationModality, error) {
	setClauses := make([]string, 0, 3)
	args := make([]any, 0, 5)
	addField := func(column string, value any) {
		args = append(args, value)
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", column, len(args)))
	}
	if input.EducationModalityID != nil {
		addField("education_modality_id", *input.EducationModalityID)
	}
	if input.StudentCount != nil {
		addField("student_count", *input.StudentCount)
	}
	if input.Active != nil {
		addField("active", *input.Active)
	}
	args = append(args, schoolID, id)
	query := fmt.Sprintf(`
		UPDATE school_education_modalities
		SET %s, updated_at = now()
		WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND school_id = $%d AND id = $%d
		RETURNING id, school_id, education_modality_id,
			(SELECT name FROM education_modalities WHERE tenant_id = school_education_modalities.tenant_id AND id = school_education_modalities.education_modality_id),
			student_count, active, created_at, updated_at
	`, strings.Join(setClauses, ", "), len(args)-1, len(args))

	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, query, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return SchoolEducationModality{}, ErrNotFound
	}
	if err != nil {
		return SchoolEducationModality{}, mapPostgresError(err)
	}
	return item, nil
}

func (r *Repository) SoftDelete(ctx context.Context, schoolID int64, id int64) (SchoolEducationModality, error) {
	const query = `
		UPDATE school_education_modalities
		SET active = false, updated_at = now()
		WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND school_id = $1 AND id = $2
		RETURNING id, school_id, education_modality_id,
			(SELECT name FROM education_modalities WHERE tenant_id = school_education_modalities.tenant_id AND id = school_education_modalities.education_modality_id),
			student_count, active, created_at, updated_at
	`
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, query, schoolID, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return SchoolEducationModality{}, ErrNotFound
	}
	if err != nil {
		return SchoolEducationModality{}, err
	}
	return item, nil
}

type rowScanner interface {
	Scan(...any) error
}

func scan(row rowScanner) (SchoolEducationModality, error) {
	var item SchoolEducationModality
	if err := row.Scan(
		&item.ID,
		&item.SchoolID,
		&item.EducationModalityID,
		&item.EducationModalityName,
		&item.StudentCount,
		&item.Active,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return SchoolEducationModality{}, err
	}
	return item, nil
}

func mapPostgresError(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return ErrConflict
		case "23503":
			return ErrNotFound
		}
	}
	return err
}
