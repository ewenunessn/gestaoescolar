package suppliers

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
func (r *Repository) Create(ctx context.Context, in CreateRequest) (Supplier, error) {
	active := true
	if in.Active != nil {
		active = *in.Active
	}
	db := database.ExecutorFromContext(ctx, r.db)
	s, err := scan(db.QueryRow(ctx, `insert into suppliers (tenant_id,name,document,supplier_type,address,city,state,postal_code,contact_name,phone,email,active) values (current_setting('app.tenant_id', true)::uuid,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id,name,document,supplier_type,address,city,state,postal_code,contact_name,phone,email,active,created_at,updated_at`, in.Name, in.Document, in.SupplierType, nullable(in.Address), nullable(in.City), nullable(in.State), nullable(in.PostalCode), nullable(in.ContactName), nullable(in.Phone), nullable(in.Email), active))
	if err != nil {
		return Supplier{}, mapErr(err)
	}
	return s, nil
}
func (r *Repository) GetByID(ctx context.Context, id int64) (Supplier, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	s, err := scan(db.QueryRow(ctx, `select id,name,document,supplier_type,address,city,state,postal_code,contact_name,phone,email,active,created_at,updated_at from suppliers where tenant_id=current_setting('app.tenant_id', true)::uuid and id=$1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Supplier{}, ErrNotFound
	}
	return s, err
}
func (r *Repository) List(ctx context.Context, q ListQuery) ([]Supplier, *int64, error) {
	conds := []string{"tenant_id=current_setting('app.tenant_id', true)::uuid"}
	args := []any{}
	if q.Active != nil {
		args = append(args, *q.Active)
		conds = append(conds, fmt.Sprintf("active=$%d", len(args)))
	}
	if q.SupplierType != nil {
		args = append(args, *q.SupplierType)
		conds = append(conds, fmt.Sprintf("supplier_type=$%d", len(args)))
	}
	if q.Search != "" {
		args = append(args, "%"+q.Search+"%")
		conds = append(conds, fmt.Sprintf("(name ilike $%d or document ilike $%d)", len(args), len(args)))
	}
	if q.Cursor != nil {
		args = append(args, *q.Cursor)
		conds = append(conds, fmt.Sprintf("id>$%d", len(args)))
	}
	args = append(args, q.Limit+1)
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, `select id,name,document,supplier_type,address,city,state,postal_code,contact_name,phone,email,active,created_at,updated_at from suppliers where `+strings.Join(conds, " and ")+fmt.Sprintf(" order by id asc limit $%d", len(args)), args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	items := []Supplier{}
	for rows.Next() {
		x, err := scan(rows)
		if err != nil {
			return nil, nil, err
		}
		items = append(items, x)
	}
	var next *int64
	if len(items) > q.Limit {
		c := items[q.Limit-1].ID
		next = &c
		items = items[:q.Limit]
	}
	return items, next, rows.Err()
}
func (r *Repository) Update(ctx context.Context, id int64, in UpdateRequest) (Supplier, error) {
	sets := []string{}
	args := []any{}
	add := func(c string, v any) {
		args = append(args, v)
		sets = append(sets, fmt.Sprintf("%s=$%d", c, len(args)))
	}
	if in.Name != nil {
		add("name", *in.Name)
	}
	if in.Document != nil {
		add("document", *in.Document)
	}
	if in.SupplierType != nil {
		add("supplier_type", *in.SupplierType)
	}
	if in.Address != nil {
		add("address", nullable(*in.Address))
	}
	if in.City != nil {
		add("city", nullable(*in.City))
	}
	if in.State != nil {
		add("state", nullable(*in.State))
	}
	if in.PostalCode != nil {
		add("postal_code", nullable(*in.PostalCode))
	}
	if in.ContactName != nil {
		add("contact_name", nullable(*in.ContactName))
	}
	if in.Phone != nil {
		add("phone", nullable(*in.Phone))
	}
	if in.Email != nil {
		add("email", nullable(*in.Email))
	}
	if in.Active != nil {
		add("active", *in.Active)
	}
	args = append(args, id)
	db := database.ExecutorFromContext(ctx, r.db)
	s, err := scan(db.QueryRow(ctx, fmt.Sprintf(`update suppliers set %s, updated_at=now() where tenant_id=current_setting('app.tenant_id', true)::uuid and id=$%d returning id,name,document,supplier_type,address,city,state,postal_code,contact_name,phone,email,active,created_at,updated_at`, strings.Join(sets, ","), len(args)), args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return Supplier{}, ErrNotFound
	}
	if err != nil {
		return Supplier{}, mapErr(err)
	}
	return s, nil
}
func (r *Repository) SoftDelete(ctx context.Context, id int64) (Supplier, error) {
	f := false
	return r.Update(ctx, id, UpdateRequest{Active: &f})
}

type scanner interface{ Scan(...any) error }

func scan(row scanner) (Supplier, error) {
	var s Supplier
	err := row.Scan(&s.ID, &s.Name, &s.Document, &s.SupplierType, &s.Address, &s.City, &s.State, &s.PostalCode, &s.ContactName, &s.Phone, &s.Email, &s.Active, &s.CreatedAt, &s.UpdatedAt)
	return s, err
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
