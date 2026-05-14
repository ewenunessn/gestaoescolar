package contractproducts

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

func (r *Repository) Create(ctx context.Context, input CreateInput) (ContractProduct, error) {
	const query = `
		INSERT INTO contract_products (
			tenant_id, contract_id, product_id, quantity, unit_price, total_amount, notes, active
		)
		VALUES (current_setting('app.tenant_id', true)::uuid, $1, $2, $3, $4, $5, $6, $7)
		RETURNING id, contract_id, product_id,
			(SELECT name FROM products WHERE tenant_id = contract_products.tenant_id AND id = contract_products.product_id),
			quantity::text, unit_price::text, total_amount::text, notes, active, created_at, updated_at
	`
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, query, input.ContractID, input.ProductID, input.Quantity, input.UnitPrice, input.TotalAmount, nullable(input.Notes), input.Active))
	if err != nil {
		return ContractProduct{}, mapPostgresError(err)
	}
	return item, nil
}

func (r *Repository) ListByContract(ctx context.Context, contractID int64, query ListQuery) (ListResult, error) {
	const sql = `
		SELECT cp.id, cp.contract_id, cp.product_id, p.name,
			cp.quantity::text, cp.unit_price::text, cp.total_amount::text, cp.notes, cp.active, cp.created_at, cp.updated_at
		FROM contract_products cp
		JOIN products p ON p.tenant_id = cp.tenant_id AND p.id = cp.product_id
		WHERE cp.tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND cp.contract_id = $1
		  AND ($2::bigint IS NULL OR cp.id > $2)
		ORDER BY cp.id
		LIMIT $3
	`
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, sql, contractID, query.Cursor, query.Limit+1)
	if err != nil {
		return ListResult{}, err
	}
	defer rows.Close()

	items := []ContractProduct{}
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

func (r *Repository) GetByID(ctx context.Context, contractID int64, id int64) (ContractProduct, error) {
	const query = `
		SELECT cp.id, cp.contract_id, cp.product_id, p.name,
			cp.quantity::text, cp.unit_price::text, cp.total_amount::text, cp.notes, cp.active, cp.created_at, cp.updated_at
		FROM contract_products cp
		JOIN products p ON p.tenant_id = cp.tenant_id AND p.id = cp.product_id
		WHERE cp.tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND cp.contract_id = $1 AND cp.id = $2
	`
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, query, contractID, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return ContractProduct{}, ErrNotFound
	}
	return item, err
}

func (r *Repository) Update(ctx context.Context, contractID int64, id int64, input UpdateInput) (ContractProduct, error) {
	setClauses := make([]string, 0, 6)
	args := make([]any, 0, 8)
	var quantityArg int
	var unitPriceArg int
	addField := func(column string, value any) {
		args = append(args, value)
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", column, len(args)))
	}
	if input.ProductID != nil {
		addField("product_id", *input.ProductID)
	}
	if input.Quantity != nil {
		addField("quantity", *input.Quantity)
		quantityArg = len(args)
	}
	if input.UnitPrice != nil {
		addField("unit_price", *input.UnitPrice)
		unitPriceArg = len(args)
	}
	switch {
	case quantityArg > 0 && unitPriceArg > 0:
		setClauses = append(setClauses, fmt.Sprintf("total_amount = $%d * $%d", quantityArg, unitPriceArg))
	case quantityArg > 0:
		setClauses = append(setClauses, fmt.Sprintf("total_amount = $%d * unit_price", quantityArg))
	case unitPriceArg > 0:
		setClauses = append(setClauses, fmt.Sprintf("total_amount = quantity * $%d", unitPriceArg))
	}
	if input.Notes != nil {
		addField("notes", nullable(*input.Notes))
	}
	if input.Active != nil {
		addField("active", *input.Active)
	}
	args = append(args, contractID, id)
	query := fmt.Sprintf(`
		UPDATE contract_products
		SET %s, updated_at = now()
		WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND contract_id = $%d AND id = $%d
		RETURNING id, contract_id, product_id,
			(SELECT name FROM products WHERE tenant_id = contract_products.tenant_id AND id = contract_products.product_id),
			quantity::text, unit_price::text, total_amount::text, notes, active, created_at, updated_at
	`, strings.Join(setClauses, ", "), len(args)-1, len(args))

	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, query, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return ContractProduct{}, ErrNotFound
	}
	if err != nil {
		return ContractProduct{}, mapPostgresError(err)
	}
	return item, nil
}

func (r *Repository) SoftDelete(ctx context.Context, contractID int64, id int64) (ContractProduct, error) {
	inactive := false
	return r.Update(ctx, contractID, id, UpdateInput{Active: &inactive})
}

type rowScanner interface {
	Scan(...any) error
}

func scan(row rowScanner) (ContractProduct, error) {
	var item ContractProduct
	if err := row.Scan(
		&item.ID,
		&item.ContractID,
		&item.ProductID,
		&item.ProductName,
		&item.Quantity,
		&item.UnitPrice,
		&item.TotalAmount,
		&item.Notes,
		&item.Active,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return ContractProduct{}, err
	}
	return item, nil
}

func nullable(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
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
