package contracts

import (
	"context"
	"errors"
	"fmt"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/database"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"strings"
)

type Repository struct{ db database.DBTX }

func NewRepository(db database.DBTX) *Repository { return &Repository{db: db} }

const contractTotalSQL = `coalesce((select sum(cp.total_amount) from contract_products cp where cp.tenant_id=c.tenant_id and cp.contract_id=c.id and cp.active), 0)::text`

const selectSQL = `select c.id,c.number,c.supplier_id,s.name,c.start_date::text,c.end_date::text,` + contractTotalSQL + `,c.status,c.contract_type,c.notes,c.active,c.created_at,c.updated_at from contracts c join suppliers s on s.tenant_id=c.tenant_id and s.id=c.supplier_id`

func (r *Repository) Create(ctx context.Context, in CreateRequest) (Contract, error) {
	active := true
	if in.Active != nil {
		active = *in.Active
	}
	db := database.ExecutorFromContext(ctx, r.db)
	c, err := scan(db.QueryRow(ctx, `insert into contracts (tenant_id,number,supplier_id,start_date,end_date,status,contract_type,notes,active) values (current_setting('app.tenant_id', true)::uuid,$1,$2,$3,$4,$5,$6,$7,$8) returning id,number,supplier_id,(select name from suppliers where tenant_id=contracts.tenant_id and id=contracts.supplier_id),start_date::text,end_date::text,0::text,status,contract_type,notes,active,created_at,updated_at`, in.Number, in.SupplierID, in.StartDate, in.EndDate, in.Status, in.ContractType, nullable(in.Notes), active))
	if err != nil {
		return Contract{}, mapErr(err)
	}
	return c, nil
}
func (r *Repository) GetByID(ctx context.Context, id int64) (Contract, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	c, err := scan(db.QueryRow(ctx, selectSQL+` where c.tenant_id=current_setting('app.tenant_id', true)::uuid and c.id=$1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Contract{}, ErrNotFound
	}
	return c, err
}
func (r *Repository) List(ctx context.Context, q ListQuery) ([]Contract, *int64, error) {
	conds := []string{"c.tenant_id=current_setting('app.tenant_id', true)::uuid"}
	args := []any{}
	if q.Active != nil {
		args = append(args, *q.Active)
		conds = append(conds, fmt.Sprintf("c.active=$%d", len(args)))
	}
	if q.Status != nil {
		args = append(args, *q.Status)
		conds = append(conds, fmt.Sprintf("c.status=$%d", len(args)))
	}
	if q.SupplierID != nil {
		args = append(args, *q.SupplierID)
		conds = append(conds, fmt.Sprintf("c.supplier_id=$%d", len(args)))
	}
	if q.Search != "" {
		args = append(args, "%"+q.Search+"%")
		conds = append(conds, fmt.Sprintf("(c.number ilike $%d or s.name ilike $%d)", len(args), len(args)))
	}
	if q.Cursor != nil {
		args = append(args, *q.Cursor)
		conds = append(conds, fmt.Sprintf("c.id>$%d", len(args)))
	}
	args = append(args, q.Limit+1)
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, selectSQL+" where "+strings.Join(conds, " and ")+fmt.Sprintf(" order by c.id asc limit $%d", len(args)), args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	items := []Contract{}
	for rows.Next() {
		x, err := scan(rows)
		if err != nil {
			return nil, nil, err
		}
		items = append(items, x)
	}
	var next *int64
	if len(items) > q.Limit {
		cc := items[q.Limit-1].ID
		next = &cc
		items = items[:q.Limit]
	}
	return items, next, rows.Err()
}
func (r *Repository) Update(ctx context.Context, id int64, in UpdateRequest) (Contract, error) {
	sets := []string{}
	args := []any{}
	add := func(c string, v any) {
		args = append(args, v)
		sets = append(sets, fmt.Sprintf("%s=$%d", c, len(args)))
	}
	if in.Number != nil {
		add("number", *in.Number)
	}
	if in.SupplierID != nil {
		add("supplier_id", *in.SupplierID)
	}
	if in.StartDate != nil {
		add("start_date", *in.StartDate)
	}
	if in.EndDate != nil {
		add("end_date", *in.EndDate)
	}
	if in.Status != nil {
		add("status", *in.Status)
	}
	if in.ContractType != nil {
		add("contract_type", *in.ContractType)
	}
	if in.Notes != nil {
		add("notes", nullable(*in.Notes))
	}
	if in.Active != nil {
		add("active", *in.Active)
	}
	args = append(args, id)
	db := database.ExecutorFromContext(ctx, r.db)
	c, err := scan(db.QueryRow(ctx, fmt.Sprintf(`update contracts set %s, updated_at=now() where tenant_id=current_setting('app.tenant_id', true)::uuid and id=$%d returning id,number,supplier_id,(select name from suppliers where tenant_id=contracts.tenant_id and id=contracts.supplier_id),start_date::text,end_date::text,(select coalesce(sum(cp.total_amount),0)::text from contract_products cp where cp.tenant_id=contracts.tenant_id and cp.contract_id=contracts.id and cp.active),status,contract_type,notes,active,created_at,updated_at`, strings.Join(sets, ","), len(args)), args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return Contract{}, ErrNotFound
	}
	if err != nil {
		return Contract{}, mapErr(err)
	}
	return c, nil
}
func (r *Repository) SoftDelete(ctx context.Context, id int64) (Contract, error) {
	f := false
	return r.Update(ctx, id, UpdateRequest{Active: &f})
}

type scanner interface{ Scan(...any) error }

func scan(row scanner) (Contract, error) {
	var c Contract
	err := row.Scan(&c.ID, &c.Number, &c.SupplierID, &c.SupplierName, &c.StartDate, &c.EndDate, &c.TotalAmount, &c.Status, &c.ContractType, &c.Notes, &c.Active, &c.CreatedAt, &c.UpdatedAt)
	return c, err
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
