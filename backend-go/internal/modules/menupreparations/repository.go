package menupreparations

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

const selectSQL = `select mp.id,mp.menu_id,mp.day,mp.meal_type_id,mt.name,mp.preparation_id,p.name,mp.notes,mp.active,mp.created_at,mp.updated_at from menu_preparations mp join meal_types mt on mt.tenant_id=mp.tenant_id and mt.id=mp.meal_type_id join preparations p on p.tenant_id=mp.tenant_id and p.id=mp.preparation_id`

func (r *Repository) Create(ctx context.Context, menuID int64, in CreateRequest) (MenuPreparation, error) {
	active := true
	if in.Active != nil {
		active = *in.Active
	}
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, `insert into menu_preparations (tenant_id,menu_id,day,meal_type_id,preparation_id,notes,active) values (current_setting('app.tenant_id', true)::uuid,$1,$2,$3,$4,$5,$6) returning id,menu_id,day,meal_type_id,(select name from meal_types where tenant_id=menu_preparations.tenant_id and id=menu_preparations.meal_type_id),preparation_id,(select name from preparations where tenant_id=menu_preparations.tenant_id and id=menu_preparations.preparation_id),notes,active,created_at,updated_at`, menuID, in.Day, in.MealID, in.PreparationID, nullable(in.Notes), active))
	if err != nil {
		return MenuPreparation{}, mapErr(err)
	}
	return item, nil
}

func (r *Repository) ListByMenu(ctx context.Context, menuID int64, q ListQuery) ([]MenuPreparation, *int64, error) {
	conds := []string{"mp.tenant_id=current_setting('app.tenant_id', true)::uuid", "mp.menu_id=$1"}
	args := []any{menuID}
	if q.Day != nil {
		args = append(args, *q.Day)
		conds = append(conds, fmt.Sprintf("mp.day=$%d", len(args)))
	}
	if q.Active != nil {
		args = append(args, *q.Active)
		conds = append(conds, fmt.Sprintf("mp.active=$%d", len(args)))
	}
	if q.Cursor != nil {
		args = append(args, *q.Cursor)
		conds = append(conds, fmt.Sprintf("mp.id>$%d", len(args)))
	}
	args = append(args, q.Limit+1)
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, selectSQL+" where "+strings.Join(conds, " and ")+fmt.Sprintf(" order by mp.day,mt.sort_order,mp.id limit $%d", len(args)), args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	items := []MenuPreparation{}
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

func (r *Repository) GetByID(ctx context.Context, menuID int64, id int64) (MenuPreparation, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, selectSQL+` where mp.tenant_id=current_setting('app.tenant_id', true)::uuid and mp.menu_id=$1 and mp.id=$2`, menuID, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return MenuPreparation{}, ErrNotFound
	}
	return item, err
}

func (r *Repository) Update(ctx context.Context, menuID int64, id int64, in UpdateRequest) (MenuPreparation, error) {
	sets := []string{}
	args := []any{}
	add := func(c string, v any) {
		args = append(args, v)
		sets = append(sets, fmt.Sprintf("%s=$%d", c, len(args)))
	}
	if in.Day != nil {
		add("day", *in.Day)
	}
	if in.MealID != nil {
		add("meal_type_id", *in.MealID)
	}
	if in.PreparationID != nil {
		add("preparation_id", *in.PreparationID)
	}
	if in.Notes != nil {
		add("notes", nullable(*in.Notes))
	}
	if in.Active != nil {
		add("active", *in.Active)
	}
	args = append(args, menuID, id)
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, fmt.Sprintf(`update menu_preparations set %s, updated_at=now() where tenant_id=current_setting('app.tenant_id', true)::uuid and menu_id=$%d and id=$%d returning id,menu_id,day,meal_type_id,(select name from meal_types where tenant_id=menu_preparations.tenant_id and id=menu_preparations.meal_type_id),preparation_id,(select name from preparations where tenant_id=menu_preparations.tenant_id and id=menu_preparations.preparation_id),notes,active,created_at,updated_at`, strings.Join(sets, ","), len(args)-1, len(args)), args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return MenuPreparation{}, ErrNotFound
	}
	if err != nil {
		return MenuPreparation{}, mapErr(err)
	}
	return item, nil
}

func (r *Repository) SoftDelete(ctx context.Context, menuID int64, id int64) (MenuPreparation, error) {
	inactive := false
	return r.Update(ctx, menuID, id, UpdateRequest{Active: &inactive})
}

type scanner interface{ Scan(...any) error }

func scan(row scanner) (MenuPreparation, error) {
	var item MenuPreparation
	err := row.Scan(&item.ID, &item.MenuID, &item.Day, &item.MealID, &item.MealName, &item.PreparationID, &item.PreparationName, &item.Notes, &item.Active, &item.CreatedAt, &item.UpdatedAt)
	return item, err
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
