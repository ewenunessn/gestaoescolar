package menus

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

func (r *Repository) Create(ctx context.Context, in CreateInput) (Menu, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, `insert into menus (tenant_id,name,description,year,month,start_date,end_date,active) values (current_setting('app.tenant_id', true)::uuid,$1,$2,$3,$4,$5,$6,$7) returning id,name,description,year,month,start_date::text,end_date::text,active,created_at,updated_at`, in.Name, in.Description, in.Year, in.Month, in.StartDate, in.EndDate, in.Active))
	if err != nil {
		return Menu{}, mapErr(err)
	}
	if err := r.replaceModalities(ctx, item.ID, in.EducationModalityIDs); err != nil {
		return Menu{}, err
	}
	item.EducationModalityIDs, _ = r.listModalities(ctx, item.ID)
	return item, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (Menu, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, `select id,name,description,year,month,start_date::text,end_date::text,active,created_at,updated_at from menus where tenant_id=current_setting('app.tenant_id', true)::uuid and id=$1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Menu{}, ErrNotFound
	}
	if err != nil {
		return Menu{}, err
	}
	item.EducationModalityIDs, err = r.listModalities(ctx, item.ID)
	return item, err
}

func (r *Repository) List(ctx context.Context, q ListQuery) ([]Menu, *int64, error) {
	conds := []string{"tenant_id=current_setting('app.tenant_id', true)::uuid"}
	args := []any{}
	if q.Active != nil {
		args = append(args, *q.Active)
		conds = append(conds, fmt.Sprintf("active=$%d", len(args)))
	}
	if q.Year != nil {
		args = append(args, *q.Year)
		conds = append(conds, fmt.Sprintf("year=$%d", len(args)))
	}
	if q.Month != nil {
		args = append(args, *q.Month)
		conds = append(conds, fmt.Sprintf("month=$%d", len(args)))
	}
	if q.Search != "" {
		args = append(args, "%"+q.Search+"%")
		conds = append(conds, fmt.Sprintf("(name ilike $%d or description ilike $%d)", len(args), len(args)))
	}
	if q.Cursor != nil {
		args = append(args, *q.Cursor)
		conds = append(conds, fmt.Sprintf("id>$%d", len(args)))
	}
	args = append(args, q.Limit+1)
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, `select id,name,description,year,month,start_date::text,end_date::text,active,created_at,updated_at from menus where `+strings.Join(conds, " and ")+fmt.Sprintf(" order by id asc limit $%d", len(args)), args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	items := []Menu{}
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, nil, err
		}
		item.EducationModalityIDs, _ = r.listModalities(ctx, item.ID)
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

func (r *Repository) Update(ctx context.Context, id int64, in UpdateInput) (Menu, error) {
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
		add("description", in.Description)
	}
	if in.Year != nil {
		add("year", *in.Year)
	}
	if in.Month != nil {
		add("month", *in.Month)
	}
	if in.StartDate != nil {
		add("start_date", *in.StartDate)
	}
	if in.EndDate != nil {
		add("end_date", *in.EndDate)
	}
	if in.Active != nil {
		add("active", *in.Active)
	}
	if len(sets) == 0 && in.ReplaceModalities {
		if err := r.replaceModalities(ctx, id, in.EducationModalityIDs); err != nil {
			return Menu{}, err
		}
		return r.GetByID(ctx, id)
	}
	args = append(args, id)
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, fmt.Sprintf(`update menus set %s, updated_at=now() where tenant_id=current_setting('app.tenant_id', true)::uuid and id=$%d returning id,name,description,year,month,start_date::text,end_date::text,active,created_at,updated_at`, strings.Join(sets, ","), len(args)), args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return Menu{}, ErrNotFound
	}
	if err != nil {
		return Menu{}, mapErr(err)
	}
	if in.ReplaceModalities {
		if err := r.replaceModalities(ctx, id, in.EducationModalityIDs); err != nil {
			return Menu{}, err
		}
	}
	item.EducationModalityIDs, err = r.listModalities(ctx, item.ID)
	return item, err
}

func (r *Repository) SoftDelete(ctx context.Context, id int64) (Menu, error) {
	inactive := false
	return r.Update(ctx, id, UpdateInput{Active: &inactive})
}

func (r *Repository) replaceModalities(ctx context.Context, menuID int64, ids []int64) error {
	db := database.ExecutorFromContext(ctx, r.db)
	if _, err := db.Exec(ctx, `delete from menu_education_modalities where tenant_id=current_setting('app.tenant_id', true)::uuid and menu_id=$1`, menuID); err != nil {
		return err
	}
	for _, id := range ids {
		if _, err := db.Exec(ctx, `insert into menu_education_modalities (tenant_id,menu_id,education_modality_id) values (current_setting('app.tenant_id', true)::uuid,$1,$2)`, menuID, id); err != nil {
			return mapErr(err)
		}
	}
	return nil
}

func (r *Repository) listModalities(ctx context.Context, menuID int64) ([]int64, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, `select education_modality_id from menu_education_modalities where tenant_id=current_setting('app.tenant_id', true)::uuid and menu_id=$1 order by education_modality_id`, menuID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

type scanner interface{ Scan(...any) error }

func scan(row scanner) (Menu, error) {
	var item Menu
	err := row.Scan(&item.ID, &item.Name, &item.Description, &item.Year, &item.Month, &item.StartDate, &item.EndDate, &item.Active, &item.CreatedAt, &item.UpdatedAt)
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
