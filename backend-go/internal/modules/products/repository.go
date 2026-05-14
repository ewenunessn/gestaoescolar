package products

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

func (r *Repository) Create(ctx context.Context, in CreateRequest) (Product, error) {
	active := true
	if in.Active != nil {
		active = *in.Active
	}
	correctionFactor := 1.0
	if in.CorrectionFactor != nil {
		correctionFactor = *in.CorrectionFactor
	}
	desc := nullable(in.Description)
	db := database.ExecutorFromContext(ctx, r.db)
	p, err := scan(db.QueryRow(ctx, `insert into products (tenant_id,name,description,unit,category,fator_correcao,active) values (current_setting('app.tenant_id', true)::uuid,$1,$2,$3,$4,$5,$6) returning id,name,description,unit,category,fator_correcao::float8,active,created_at,updated_at`, in.Name, desc, in.Unit, in.Category, correctionFactor, active))
	if err != nil {
		return Product{}, mapErr(err)
	}
	return p, nil
}
func (r *Repository) GetByID(ctx context.Context, id int64) (Product, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	p, err := scan(db.QueryRow(ctx, `select id,name,description,unit,category,fator_correcao::float8,active,created_at,updated_at from products where tenant_id=current_setting('app.tenant_id', true)::uuid and id=$1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Product{}, ErrNotFound
	}
	return p, err
}
func (r *Repository) List(ctx context.Context, q ListQuery) ([]Product, *int64, error) {
	conds := []string{"tenant_id=current_setting('app.tenant_id', true)::uuid"}
	args := []any{}
	if q.Active != nil {
		args = append(args, *q.Active)
		conds = append(conds, fmt.Sprintf("active=$%d", len(args)))
	}
	if q.Search != "" {
		args = append(args, "%"+q.Search+"%")
		conds = append(conds, fmt.Sprintf("(name ilike $%d or category ilike $%d)", len(args), len(args)))
	}
	if q.Cursor != nil {
		args = append(args, *q.Cursor)
		conds = append(conds, fmt.Sprintf("id>$%d", len(args)))
	}
	args = append(args, q.Limit+1)
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, `select id,name,description,unit,category,fator_correcao::float8,active,created_at,updated_at from products where `+strings.Join(conds, " and ")+fmt.Sprintf(" order by id asc limit $%d", len(args)), args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	items := []Product{}
	for rows.Next() {
		p, err := scan(rows)
		if err != nil {
			return nil, nil, err
		}
		items = append(items, p)
	}
	var next *int64
	if len(items) > q.Limit {
		c := items[q.Limit-1].ID
		next = &c
		items = items[:q.Limit]
	}
	return items, next, rows.Err()
}
func (r *Repository) Update(ctx context.Context, id int64, in UpdateRequest) (Product, error) {
	sets := []string{}
	args := []any{}
	add := func(c string, v any) {
		args = append(args, v)
		sets = append(sets, fmt.Sprintf("%s=$%d", c, len(args)))
	}
	if in.Name != nil {
		add("name", *in.Name)
	}
	if in.Description != nil {
		add("description", nullable(*in.Description))
	}
	if in.Unit != nil {
		add("unit", *in.Unit)
	}
	if in.Category != nil {
		add("category", *in.Category)
	}
	if in.CorrectionFactor != nil {
		add("fator_correcao", *in.CorrectionFactor)
	}
	if in.Active != nil {
		add("active", *in.Active)
	}
	args = append(args, id)
	db := database.ExecutorFromContext(ctx, r.db)
	p, err := scan(db.QueryRow(ctx, fmt.Sprintf(`update products set %s, updated_at=now() where tenant_id=current_setting('app.tenant_id', true)::uuid and id=$%d returning id,name,description,unit,category,fator_correcao::float8,active,created_at,updated_at`, strings.Join(sets, ","), len(args)), args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return Product{}, ErrNotFound
	}
	if err != nil {
		return Product{}, mapErr(err)
	}
	return p, nil
}
func (r *Repository) SoftDelete(ctx context.Context, id int64) (Product, error) {
	f := false
	return r.Update(ctx, id, UpdateRequest{Active: &f})
}

type scanner interface{ Scan(...any) error }

func scan(row scanner) (Product, error) {
	var p Product
	err := row.Scan(&p.ID, &p.Name, &p.Description, &p.Unit, &p.Category, &p.CorrectionFactor, &p.Active, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}
func nullable(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}
func mapErr(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrConflict
	}
	return err
}
