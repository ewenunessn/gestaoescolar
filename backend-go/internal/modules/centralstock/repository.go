package centralstock

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/ewenunessn/gestaoescolar/backend-go/internal/database"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type Repository struct{ db database.DBTX }

func NewRepository(db database.DBTX) *Repository { return &Repository{db: db} }

const selectSQL = `select csm.id,csm.product_id,p.name,p.unit,csm.movement_type,csm.quantity::text,csm.quantity_delta::text,csm.occurred_at::text,csm.description,csm.reference_document,csm.source_school_id,source_sc.name,csm.destination_school_id,dest_sc.name,csm.transfer_group_id::text,csm.created_at from central_stock_movements csm join products p on p.tenant_id=csm.tenant_id and p.id=csm.product_id left join schools source_sc on source_sc.tenant_id=csm.tenant_id and source_sc.id=csm.source_school_id left join schools dest_sc on dest_sc.tenant_id=csm.tenant_id and dest_sc.id=csm.destination_school_id`

func (r *Repository) Create(ctx context.Context, in CreateRequest, delta string) (Movement, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	if strings.HasPrefix(delta, "-") {
		if err := ensureCentralBalance(ctx, db, in.ProductID, delta); err != nil {
			return Movement{}, err
		}
	}
	var transferGroup *string
	if in.MovementType == string(MovementTransfer) {
		value, err := newUUID()
		if err != nil {
			return Movement{}, err
		}
		transferGroup = &value
	}
	var id int64
	if err := db.QueryRow(ctx, `insert into central_stock_movements (tenant_id,product_id,movement_type,quantity,quantity_delta,occurred_at,description,reference_document,destination_school_id,transfer_group_id) values (current_setting('app.tenant_id', true)::uuid,$1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`, in.ProductID, in.MovementType, in.Quantity, delta, in.OccurredAt, nullable(in.Description), nullable(in.ReferenceDocument), in.DestinationSchoolID, transferGroup).Scan(&id); err != nil {
		return Movement{}, mapErr(err)
	}
	if in.MovementType == string(MovementTransfer) {
		if _, err := db.Exec(ctx, `insert into school_stock_movements (tenant_id,school_id,product_id,movement_type,quantity,quantity_delta,occurred_at,description,reference_document,transfer_group_id) select tenant_id,destination_school_id,product_id,movement_type,quantity,quantity,occurred_at,description,reference_document,transfer_group_id from central_stock_movements where tenant_id=current_setting('app.tenant_id', true)::uuid and id=$1`, id); err != nil {
			return Movement{}, mapErr(err)
		}
	}
	return r.GetByID(ctx, id)
}

func (r *Repository) GetByID(ctx context.Context, id int64) (Movement, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	item, err := scan(db.QueryRow(ctx, selectSQL+` where csm.tenant_id=current_setting('app.tenant_id', true)::uuid and csm.id=$1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Movement{}, ErrNotFound
	}
	return item, err
}

func (r *Repository) List(ctx context.Context, q ListQuery) ([]Movement, *int64, error) {
	conds := []string{"csm.tenant_id=current_setting('app.tenant_id', true)::uuid"}
	args := []any{}
	if q.ProductID != nil {
		args = append(args, *q.ProductID)
		conds = append(conds, fmt.Sprintf("csm.product_id=$%d", len(args)))
	}
	if q.MovementType != nil {
		args = append(args, string(*q.MovementType))
		conds = append(conds, fmt.Sprintf("csm.movement_type=$%d", len(args)))
	}
	if q.Cursor != nil {
		args = append(args, *q.Cursor)
		conds = append(conds, fmt.Sprintf("csm.id>$%d", len(args)))
	}
	args = append(args, q.Limit+1)
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, selectSQL+" where "+strings.Join(conds, " and ")+fmt.Sprintf(" order by csm.id asc limit $%d", len(args)), args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	items := []Movement{}
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

func (r *Repository) Balances(ctx context.Context) ([]Balance, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, `select p.id,p.name,p.unit,coalesce(sum(csm.quantity_delta),0)::text from products p left join central_stock_movements csm on csm.tenant_id=p.tenant_id and csm.product_id=p.id where p.tenant_id=current_setting('app.tenant_id', true)::uuid group by p.id,p.name,p.unit having coalesce(sum(csm.quantity_delta),0) <> 0 order by p.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Balance{}
	for rows.Next() {
		var item Balance
		if err := rows.Scan(&item.ProductID, &item.ProductName, &item.ProductUnit, &item.Quantity); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

type scanner interface{ Scan(...any) error }

func scan(row scanner) (Movement, error) {
	var item Movement
	return item, row.Scan(&item.ID, &item.ProductID, &item.ProductName, &item.ProductUnit, &item.MovementType, &item.Quantity, &item.QuantityDelta, &item.OccurredAt, &item.Description, &item.ReferenceDocument, &item.SourceSchoolID, &item.SourceSchool, &item.DestinationSchoolID, &item.DestinationSchool, &item.TransferGroupID, &item.CreatedAt)
}

func ensureCentralBalance(ctx context.Context, db database.DBTX, productID int64, delta string) error {
	var ok bool
	if err := db.QueryRow(ctx, `select coalesce(sum(quantity_delta),0) + $2::numeric >= 0 from central_stock_movements where tenant_id=current_setting('app.tenant_id', true)::uuid and product_id=$1`, productID, delta).Scan(&ok); err != nil {
		return err
	}
	if !ok {
		return ErrInsufficientStock
	}
	return nil
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

func newUUID() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	dst := make([]byte, 36)
	hex.Encode(dst[0:8], b[0:4])
	dst[8] = '-'
	hex.Encode(dst[9:13], b[4:6])
	dst[13] = '-'
	hex.Encode(dst[14:18], b[6:8])
	dst[18] = '-'
	hex.Encode(dst[19:23], b[8:10])
	dst[23] = '-'
	hex.Encode(dst[24:36], b[10:16])
	return string(dst), nil
}
