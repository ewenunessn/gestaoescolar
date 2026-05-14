package centralstock

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"
)

var (
	ErrNotFound          = errors.New("central stock movement not found")
	ErrInsufficientStock = errors.New("insufficient central stock")
)

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	Create(context.Context, CreateRequest, string) (Movement, error)
	GetByID(context.Context, int64) (Movement, error)
	List(context.Context, ListQuery) ([]Movement, *int64, error)
	Balances(context.Context) ([]Balance, error)
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Create(ctx context.Context, req CreateRequest) (Movement, error) {
	delta, fields := normalizeCreate(&req)
	if req.MovementType == string(MovementTransfer) && (req.DestinationSchoolID == nil || *req.DestinationSchoolID <= 0) {
		fields["destinationSchoolId"] = "destinationSchoolId is required for transferencia"
	}
	if len(fields) > 0 {
		return Movement{}, ValidationError{Fields: fields}
	}
	return s.store.Create(ctx, req, delta)
}

func (s *Service) GetByID(ctx context.Context, id int64) (Movement, error) {
	if id <= 0 {
		return Movement{}, ValidationError{Fields: map[string]string{"id": "id must be positive"}}
	}
	return s.store.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, q ListQuery) ([]Movement, *int64, error) {
	fields := map[string]string{}
	if q.ProductID != nil && *q.ProductID <= 0 {
		fields["productId"] = "productId must be positive"
	}
	if q.MovementType != nil {
		if _, ok := parseMovementType(string(*q.MovementType)); !ok {
			fields["movementType"] = "invalid movementType"
		}
	}
	if len(fields) > 0 {
		return nil, nil, ValidationError{Fields: fields}
	}
	if q.Limit <= 0 {
		q.Limit = 50
	}
	if q.Limit > 100 {
		q.Limit = 100
	}
	return s.store.List(ctx, q)
}

func (s *Service) Balances(ctx context.Context) ([]Balance, error) {
	return s.store.Balances(ctx)
}

func normalizeCreate(req *CreateRequest) (string, map[string]string) {
	fields := map[string]string{}
	if req.ProductID <= 0 {
		fields["productId"] = "productId must be positive"
	}
	movementType, ok := parseMovementType(req.MovementType)
	if !ok {
		fields["movementType"] = "invalid movementType"
	}
	req.Quantity = strings.TrimSpace(req.Quantity)
	quantity, err := strconv.ParseFloat(req.Quantity, 64)
	if err != nil || quantity <= 0 {
		fields["quantity"] = "quantity must be greater than zero"
	}
	req.OccurredAt = strings.TrimSpace(req.OccurredAt)
	if _, err := time.Parse("2006-01-02", req.OccurredAt); err != nil {
		fields["occurredAt"] = "occurredAt must be YYYY-MM-DD"
	}
	req.Description = strings.TrimSpace(req.Description)
	req.ReferenceDocument = strings.TrimSpace(req.ReferenceDocument)
	req.MovementType = string(movementType)

	if len(fields) > 0 {
		return "", fields
	}
	switch movementType {
	case MovementEntry:
		return req.Quantity, fields
	case MovementExit, MovementTransfer:
		return "-" + req.Quantity, fields
	case MovementAdjust:
		switch AdjustmentDirection(strings.TrimSpace(req.AdjustmentDirection)) {
		case AdjustmentIncrease:
			return req.Quantity, fields
		case AdjustmentDecrease:
			return "-" + req.Quantity, fields
		default:
			fields["adjustmentDirection"] = "adjustmentDirection must be increase or decrease for ajuste"
			return "", fields
		}
	default:
		return "", fields
	}
}

func parseMovementType(value string) (MovementType, bool) {
	movementType := MovementType(strings.TrimSpace(value))
	switch movementType {
	case MovementEntry, MovementExit, MovementTransfer, MovementAdjust:
		return movementType, true
	default:
		return "", false
	}
}
