package preparationproducts

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

const selectSQL = `select pp.id,pp.preparation_id,pp.product_id,p.name,pp.education_modality_id,em.name,pp.per_capita_amount::text,pp.per_capita_unit,pp.active,pp.created_at,pp.updated_at from preparation_products pp join products p on p.tenant_id=pp.tenant_id and p.id=pp.product_id left join education_modalities em on em.tenant_id=pp.tenant_id and em.id=pp.education_modality_id`

func (r *Repository) Create(ctx context.Context, in CreateInput) (PreparationProduct, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, `insert into preparation_products (tenant_id,preparation_id,product_id,education_modality_id,per_capita_amount,per_capita_unit,active) values (current_setting('app.tenant_id', true)::uuid,$1,$2,$3,$4,$5,$6) returning id,preparation_id,product_id,(select name from products where tenant_id=preparation_products.tenant_id and id=preparation_products.product_id),education_modality_id,(select name from education_modalities where tenant_id=preparation_products.tenant_id and id=preparation_products.education_modality_id),per_capita_amount::text,per_capita_unit,active,created_at,updated_at`, in.PreparationID, in.ProductID, in.EducationModalityID, in.PerCapitaAmount, in.PerCapitaUnit, in.Active))
	if err != nil {
		return PreparationProduct{}, mapErr(err)
	}
	return item, nil
}

func (r *Repository) ListByPreparation(ctx context.Context, preparationID int64, q ListQuery) (ListResult, error) {
	conds := []string{"pp.tenant_id=current_setting('app.tenant_id', true)::uuid", "pp.preparation_id=$1"}
	args := []any{preparationID}
	if q.Cursor != nil {
		args = append(args, *q.Cursor)
		conds = append(conds, fmt.Sprintf("pp.id>$%d", len(args)))
	}
	args = append(args, q.Limit+1)
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, selectSQL+" where "+strings.Join(conds, " and ")+fmt.Sprintf(" order by pp.id asc limit $%d", len(args)), args...)
	if err != nil {
		return ListResult{}, err
	}
	defer rows.Close()
	items := []PreparationProduct{}
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
	var next *int64
	if len(items) > q.Limit {
		cursor := items[q.Limit-1].ID
		next = &cursor
		items = items[:q.Limit]
	}
	return ListResult{Items: items, NextCursor: next}, nil
}

func (r *Repository) GetByID(ctx context.Context, preparationID int64, id int64) (PreparationProduct, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, selectSQL+` where pp.tenant_id=current_setting('app.tenant_id', true)::uuid and pp.preparation_id=$1 and pp.id=$2`, preparationID, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return PreparationProduct{}, ErrNotFound
	}
	return item, err
}

func (r *Repository) Update(ctx context.Context, preparationID int64, id int64, in UpdateInput) (PreparationProduct, error) {
	sets := []string{}
	args := []any{}
	add := func(column string, value any) {
		args = append(args, value)
		sets = append(sets, fmt.Sprintf("%s=$%d", column, len(args)))
	}
	if in.ProductID != nil {
		add("product_id", *in.ProductID)
	}
	if in.EducationModalityID != nil {
		add("education_modality_id", *in.EducationModalityID)
	}
	if in.PerCapitaAmount != nil {
		add("per_capita_amount", *in.PerCapitaAmount)
	}
	if in.PerCapitaUnit != nil {
		add("per_capita_unit", *in.PerCapitaUnit)
	}
	if in.Active != nil {
		add("active", *in.Active)
	}
	args = append(args, preparationID, id)
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, fmt.Sprintf(`update preparation_products set %s, updated_at=now() where tenant_id=current_setting('app.tenant_id', true)::uuid and preparation_id=$%d and id=$%d returning id,preparation_id,product_id,(select name from products where tenant_id=preparation_products.tenant_id and id=preparation_products.product_id),education_modality_id,(select name from education_modalities where tenant_id=preparation_products.tenant_id and id=preparation_products.education_modality_id),per_capita_amount::text,per_capita_unit,active,created_at,updated_at`, strings.Join(sets, ","), len(args)-1, len(args)), args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return PreparationProduct{}, ErrNotFound
	}
	if err != nil {
		return PreparationProduct{}, mapErr(err)
	}
	return item, nil
}

func (r *Repository) SoftDelete(ctx context.Context, preparationID int64, id int64) (PreparationProduct, error) {
	active := false
	return r.Update(ctx, preparationID, id, UpdateInput{Active: &active})
}

type scanner interface{ Scan(...any) error }

func scan(row scanner) (PreparationProduct, error) {
	var item PreparationProduct
	err := row.Scan(&item.ID, &item.PreparationID, &item.ProductID, &item.ProductName, &item.EducationModalityID, &item.EducationModalityName, &item.PerCapitaAmount, &item.PerCapitaUnit, &item.Active, &item.CreatedAt, &item.UpdatedAt)
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
