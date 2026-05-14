package meals

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/ewenunessn/gestaoescolar/backend-go/internal/database"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type Repository struct{ db database.DBTX }

func NewRepository(db database.DBTX) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, in CreateRequest) (Meal, error) {
	active := true
	if in.Active != nil {
		active = *in.Active
	}
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, `insert into meal_types (tenant_id,name,code,sort_order,active) values (current_setting('app.tenant_id', true)::uuid,$1,$2,$3,$4) returning id,name,code,sort_order,active,created_at,updated_at`, in.Name, in.Code, in.SortOrder, active))
	if err != nil {
		return Meal{}, mapErr(err)
	}
	return item, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (Meal, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, `select id,name,code,sort_order,active,created_at,updated_at from meal_types where tenant_id=current_setting('app.tenant_id', true)::uuid and id=$1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Meal{}, ErrNotFound
	}
	return item, err
}

func (r *Repository) List(ctx context.Context, q ListQuery) ([]Meal, *int64, error) {
	conds := []string{"tenant_id=current_setting('app.tenant_id', true)::uuid"}
	args := []any{}
	if q.Active != nil {
		args = append(args, *q.Active)
		conds = append(conds, fmt.Sprintf("active=$%d", len(args)))
	}
	if q.Search != "" {
		args = append(args, "%"+q.Search+"%")
		conds = append(conds, fmt.Sprintf("(name ilike $%d or code ilike $%d)", len(args), len(args)))
	}
	if q.Cursor != nil {
		args = append(args, *q.Cursor)
		conds = append(conds, fmt.Sprintf("id>$%d", len(args)))
	}
	args = append(args, q.Limit+1)
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, `select id,name,code,sort_order,active,created_at,updated_at from meal_types where `+strings.Join(conds, " and ")+fmt.Sprintf(" order by sort_order asc,id asc limit $%d", len(args)), args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	items := []Meal{}
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, nil, err
		}
		items = append(items, item)
	}
	var next *int64
	if len(items) > q.Limit {
		cursor := items[q.Limit-1].ID
		next = &cursor
		items = items[:q.Limit]
	}
	return items, next, rows.Err()
}

func (r *Repository) Update(ctx context.Context, id int64, in UpdateRequest) (Meal, error) {
	sets := []string{}
	args := []any{}
	add := func(c string, v any) {
		args = append(args, v)
		sets = append(sets, fmt.Sprintf("%s=$%d", c, len(args)))
	}
	if in.Name != nil {
		add("name", *in.Name)
	}
	if in.Code != nil {
		add("code", *in.Code)
	}
	if in.SortOrder != nil {
		add("sort_order", *in.SortOrder)
	}
	if in.Active != nil {
		add("active", *in.Active)
	}
	args = append(args, id)
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, fmt.Sprintf(`update meal_types set %s, updated_at=now() where tenant_id=current_setting('app.tenant_id', true)::uuid and id=$%d returning id,name,code,sort_order,active,created_at,updated_at`, strings.Join(sets, ","), len(args)), args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return Meal{}, ErrNotFound
	}
	if err != nil {
		return Meal{}, mapErr(err)
	}
	return item, nil
}

func (r *Repository) SoftDelete(ctx context.Context, id int64) (Meal, error) {
	inactive := false
	return r.Update(ctx, id, UpdateRequest{Active: &inactive})
}

type scanner interface{ Scan(...any) error }

func scan(row scanner) (Meal, error) {
	var item Meal
	err := row.Scan(&item.ID, &item.Name, &item.Code, &item.SortOrder, &item.Active, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func mapErr(err error) error {
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
