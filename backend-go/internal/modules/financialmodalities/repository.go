package financialmodalities

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

func (r *Repository) Create(ctx context.Context, in CreateRequest) (FinancialModality, error) {
	active := true
	if in.Active != nil {
		active = *in.Active
	}
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, `insert into financial_modalities (tenant_id,name,code,description,funding_source,monthly_amount,payment_code,paid_installments,active) values (current_setting('app.tenant_id', true)::uuid,$1,$2,$3,$4,$5,$6,$7,$8) returning id,name,code,description,funding_source,monthly_amount::text,payment_code,paid_installments,active,created_at,updated_at`, in.Name, in.Code, nullable(in.Description), in.FundingSource, in.MonthlyAmount, nullable(in.PaymentCode), in.PaidInstallments, active))
	if err != nil {
		return FinancialModality{}, mapErr(err)
	}
	return item, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (FinancialModality, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, `select id,name,code,description,funding_source,monthly_amount::text,payment_code,paid_installments,active,created_at,updated_at from financial_modalities where tenant_id=current_setting('app.tenant_id', true)::uuid and id=$1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return FinancialModality{}, ErrNotFound
	}
	return item, err
}

func (r *Repository) List(ctx context.Context, q ListQuery) ([]FinancialModality, *int64, error) {
	conds := []string{"tenant_id=current_setting('app.tenant_id', true)::uuid"}
	args := []any{}
	if q.Active != nil {
		args = append(args, *q.Active)
		conds = append(conds, fmt.Sprintf("active=$%d", len(args)))
	}
	if q.Search != "" {
		args = append(args, "%"+q.Search+"%")
		conds = append(conds, fmt.Sprintf("(name ilike $%d or code ilike $%d or funding_source ilike $%d)", len(args), len(args), len(args)))
	}
	if q.Cursor != nil {
		args = append(args, *q.Cursor)
		conds = append(conds, fmt.Sprintf("id>$%d", len(args)))
	}
	args = append(args, q.Limit+1)
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, `select id,name,code,description,funding_source,monthly_amount::text,payment_code,paid_installments,active,created_at,updated_at from financial_modalities where `+strings.Join(conds, " and ")+fmt.Sprintf(" order by id asc limit $%d", len(args)), args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	items := []FinancialModality{}
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

func (r *Repository) Update(ctx context.Context, id int64, in UpdateRequest) (FinancialModality, error) {
	sets := []string{}
	args := []any{}
	add := func(column string, value any) {
		args = append(args, value)
		sets = append(sets, fmt.Sprintf("%s=$%d", column, len(args)))
	}
	if in.Name != nil {
		add("name", *in.Name)
	}
	if in.Code != nil {
		add("code", *in.Code)
	}
	if in.Description != nil {
		add("description", nullable(*in.Description))
	}
	if in.FundingSource != nil {
		add("funding_source", *in.FundingSource)
	}
	if in.MonthlyAmount != nil {
		add("monthly_amount", *in.MonthlyAmount)
	}
	if in.PaymentCode != nil {
		add("payment_code", nullable(*in.PaymentCode))
	}
	if in.PaidInstallments != nil {
		add("paid_installments", *in.PaidInstallments)
	}
	if in.Active != nil {
		add("active", *in.Active)
	}
	args = append(args, id)
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, fmt.Sprintf(`update financial_modalities set %s, updated_at=now() where tenant_id=current_setting('app.tenant_id', true)::uuid and id=$%d returning id,name,code,description,funding_source,monthly_amount::text,payment_code,paid_installments,active,created_at,updated_at`, strings.Join(sets, ","), len(args)), args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return FinancialModality{}, ErrNotFound
	}
	if err != nil {
		return FinancialModality{}, mapErr(err)
	}
	return item, nil
}

func (r *Repository) SoftDelete(ctx context.Context, id int64) (FinancialModality, error) {
	active := false
	return r.Update(ctx, id, UpdateRequest{Active: &active})
}

type scanner interface{ Scan(...any) error }

func scan(row scanner) (FinancialModality, error) {
	var item FinancialModality
	err := row.Scan(&item.ID, &item.Name, &item.Code, &item.Description, &item.FundingSource, &item.MonthlyAmount, &item.PaymentCode, &item.PaidInstallments, &item.Active, &item.CreatedAt, &item.UpdatedAt)
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
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrConflict
	}
	return err
}
