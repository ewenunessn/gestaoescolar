package educationmodalities

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

func (r *Repository) Create(ctx context.Context, input CreateInput) (EducationModality, error) {
	const query = `
		INSERT INTO education_modalities (tenant_id, name, description, active)
		VALUES (current_setting('app.tenant_id', true)::uuid, $1, $2, $3)
		RETURNING id, name, description, active, created_at, updated_at
	`
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scanEducationModality(db.QueryRow(ctx, query, input.Name, input.Description, input.Active))
	if err != nil {
		return EducationModality{}, mapPostgresError(err)
	}
	return item, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (EducationModality, error) {
	const query = `
		SELECT id, name, description, active, created_at, updated_at
		FROM education_modalities
		WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND id = $1
	`
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scanEducationModality(db.QueryRow(ctx, query, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return EducationModality{}, ErrNotFound
	}
	if err != nil {
		return EducationModality{}, err
	}
	return item, nil
}

func (r *Repository) List(ctx context.Context, input ListQuery) (ListResult, error) {
	conditions := []string{"tenant_id = current_setting('app.tenant_id', true)::uuid"}
	args := make([]any, 0, 4)
	if input.Active != nil {
		args = append(args, *input.Active)
		conditions = append(conditions, fmt.Sprintf("active = $%d", len(args)))
	}
	if input.Search != "" {
		args = append(args, "%"+input.Search+"%")
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR description ILIKE $%d)", len(args), len(args)))
	}
	if input.Cursor != nil {
		args = append(args, *input.Cursor)
		conditions = append(conditions, fmt.Sprintf("id > $%d", len(args)))
	}
	limit := input.Limit
	args = append(args, limit+1)

	query := `
		SELECT id, name, description, active, created_at, updated_at
		FROM education_modalities
	`
	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += fmt.Sprintf(" ORDER BY id ASC LIMIT $%d", len(args))

	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return ListResult{}, err
	}
	defer rows.Close()

	items := make([]EducationModality, 0, limit)
	for rows.Next() {
		item, err := scanEducationModality(rows)
		if err != nil {
			return ListResult{}, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return ListResult{}, err
	}

	var nextCursor *int64
	if len(items) > limit {
		cursor := items[limit-1].ID
		nextCursor = &cursor
		items = items[:limit]
	}
	return ListResult{Items: items, NextCursor: nextCursor}, nil
}

func (r *Repository) Update(ctx context.Context, id int64, input UpdateInput) (EducationModality, error) {
	setClauses := make([]string, 0, 3)
	args := make([]any, 0, 4)
	addField := func(column string, value any) {
		args = append(args, value)
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", column, len(args)))
	}
	if input.Name != nil {
		addField("name", *input.Name)
	}
	if input.Description != nil {
		addField("description", *input.Description)
	}
	if input.Active != nil {
		addField("active", *input.Active)
	}

	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE education_modalities
		SET %s, updated_at = now()
		WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND id = $%d
		RETURNING id, name, description, active, created_at, updated_at
	`, strings.Join(setClauses, ", "), len(args))

	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scanEducationModality(db.QueryRow(ctx, query, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return EducationModality{}, ErrNotFound
	}
	if err != nil {
		return EducationModality{}, mapPostgresError(err)
	}
	return item, nil
}

func (r *Repository) SoftDelete(ctx context.Context, id int64) (EducationModality, error) {
	const query = `
		UPDATE education_modalities
		SET active = false, updated_at = now()
		WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND id = $1
		RETURNING id, name, description, active, created_at, updated_at
	`
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scanEducationModality(db.QueryRow(ctx, query, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return EducationModality{}, ErrNotFound
	}
	if err != nil {
		return EducationModality{}, err
	}
	return item, nil
}

type rowScanner interface {
	Scan(...any) error
}

func scanEducationModality(row rowScanner) (EducationModality, error) {
	var item EducationModality
	if err := row.Scan(&item.ID, &item.Name, &item.Description, &item.Active, &item.CreatedAt, &item.UpdatedAt); err != nil {
		return EducationModality{}, err
	}
	return item, nil
}

func mapPostgresError(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrConflict
	}
	return err
}
