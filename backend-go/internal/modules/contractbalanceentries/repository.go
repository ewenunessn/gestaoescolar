package contractbalanceentries

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

const selectSQL = `select cbe.id,cbe.contract_id,cbe.contract_product_id,p.name,cbe.financial_modality_id,fm.name,cbe.control_type,cbe.entry_type,cbe.quantity::text,cbe.amount::text,cbe.occurred_at::text,cbe.description,cbe.reference_document,cbe.created_at from contract_balance_entries cbe join contract_products cp on cp.tenant_id=cbe.tenant_id and cp.id=cbe.contract_product_id join products p on p.tenant_id=cp.tenant_id and p.id=cp.product_id left join financial_modalities fm on fm.tenant_id=cbe.tenant_id and fm.id=cbe.financial_modality_id`

func (r *Repository) Create(ctx context.Context, contractID int64, in CreateRequest) (ContractBalanceEntry, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, `insert into contract_balance_entries (tenant_id,contract_id,contract_product_id,financial_modality_id,control_type,entry_type,quantity,amount,occurred_at,description,reference_document) values (current_setting('app.tenant_id', true)::uuid,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id,contract_id,contract_product_id,(select p.name from contract_products cp join products p on p.tenant_id=cp.tenant_id and p.id=cp.product_id where cp.tenant_id=contract_balance_entries.tenant_id and cp.id=contract_balance_entries.contract_product_id),financial_modality_id,(select name from financial_modalities where tenant_id=contract_balance_entries.tenant_id and id=contract_balance_entries.financial_modality_id),control_type,entry_type,quantity::text,amount::text,occurred_at::text,description,reference_document,created_at`, contractID, in.ContractProductID, in.FinancialModalityID, in.ControlType, in.EntryType, nullable(in.Quantity), in.Amount, in.OccurredAt, nullable(in.Description), nullable(in.ReferenceDocument)))
	if err != nil {
		return ContractBalanceEntry{}, mapErr(err)
	}
	return item, nil
}

func (r *Repository) GetByID(ctx context.Context, contractID int64, id int64) (ContractBalanceEntry, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, selectSQL+` where cbe.tenant_id=current_setting('app.tenant_id', true)::uuid and cbe.contract_id=$1 and cbe.id=$2`, contractID, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return ContractBalanceEntry{}, ErrNotFound
	}
	return item, err
}

func (r *Repository) List(ctx context.Context, contractID int64, q ListQuery) ([]ContractBalanceEntry, *int64, error) {
	conds := []string{"cbe.tenant_id=current_setting('app.tenant_id', true)::uuid", "cbe.contract_id=$1"}
	args := []any{contractID}
	if q.ContractProductID != nil {
		args = append(args, *q.ContractProductID)
		conds = append(conds, fmt.Sprintf("cbe.contract_product_id=$%d", len(args)))
	}
	if q.FinancialModalityID != nil {
		args = append(args, *q.FinancialModalityID)
		conds = append(conds, fmt.Sprintf("cbe.financial_modality_id=$%d", len(args)))
	}
	if q.EntryType != nil {
		args = append(args, *q.EntryType)
		conds = append(conds, fmt.Sprintf("cbe.entry_type=$%d", len(args)))
	}
	if q.Cursor != nil {
		args = append(args, *q.Cursor)
		conds = append(conds, fmt.Sprintf("cbe.id>$%d", len(args)))
	}
	args = append(args, q.Limit+1)
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, selectSQL+" where "+strings.Join(conds, " and ")+fmt.Sprintf(" order by cbe.id asc limit $%d", len(args)), args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	items := []ContractBalanceEntry{}
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

func (r *Repository) Summary(ctx context.Context, contractID int64) ([]BalanceSummaryItem, error) {
	const query = `
		select cbe.contract_product_id, p.name, cbe.financial_modality_id, fm.name,
			coalesce(sum(case when cbe.entry_type = 'initial_balance' then cbe.amount else 0 end), 0)::text as allocated_amount,
			coalesce(sum(case when cbe.entry_type = 'consumption' then cbe.amount else 0 end), 0)::text as consumed_amount,
			coalesce(sum(case when cbe.entry_type = 'reversal' then cbe.amount else 0 end), 0)::text as reversed_amount,
			coalesce(sum(case when cbe.entry_type = 'addendum' then cbe.amount else 0 end), 0)::text as addendum_amount,
			coalesce(sum(case
				when cbe.entry_type in ('initial_balance', 'reversal', 'addendum') then cbe.amount
				when cbe.entry_type = 'consumption' then -cbe.amount
				else 0
			end), 0)::text as balance_amount
		from contract_balance_entries cbe
		join contract_products cp on cp.tenant_id = cbe.tenant_id and cp.id = cbe.contract_product_id
		join products p on p.tenant_id = cp.tenant_id and p.id = cp.product_id
		left join financial_modalities fm on fm.tenant_id = cbe.tenant_id and fm.id = cbe.financial_modality_id
		where cbe.tenant_id = current_setting('app.tenant_id', true)::uuid
		  and cbe.contract_id = $1
		group by cbe.contract_product_id, p.name, cbe.financial_modality_id, fm.name
		order by p.name, cbe.financial_modality_id nulls first
	`
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, query, contractID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []BalanceSummaryItem{}
	for rows.Next() {
		var item BalanceSummaryItem
		if err := rows.Scan(&item.ContractProductID, &item.ProductName, &item.FinancialModalityID, &item.FinancialModalityName, &item.AllocatedAmount, &item.ConsumedAmount, &item.ReversedAmount, &item.AddendumAmount, &item.BalanceAmount); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

type scanner interface{ Scan(...any) error }

func scan(row scanner) (ContractBalanceEntry, error) {
	var item ContractBalanceEntry
	return item, row.Scan(&item.ID, &item.ContractID, &item.ContractProductID, &item.ProductName, &item.FinancialModalityID, &item.FinancialModalityName, &item.ControlType, &item.EntryType, &item.Quantity, &item.Amount, &item.OccurredAt, &item.Description, &item.ReferenceDocument, &item.CreatedAt)
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
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		return ErrNotFound
	}
	return err
}
