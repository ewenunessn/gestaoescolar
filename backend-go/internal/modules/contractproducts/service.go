package contractproducts

import (
	"context"
	"fmt"
	"strconv"
	"strings"
)

type Store interface {
	Create(context.Context, CreateInput) (ContractProduct, error)
	ListByContract(context.Context, int64, ListQuery) (ListResult, error)
	GetByID(context.Context, int64, int64) (ContractProduct, error)
	Update(context.Context, int64, int64, UpdateInput) (ContractProduct, error)
	SoftDelete(context.Context, int64, int64) (ContractProduct, error)
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, contractID int64, request CreateRequest) (ContractProduct, error) {
	fields := map[string]string{}
	if contractID <= 0 {
		fields["contractId"] = "contractId must be a positive integer"
	}
	if request.ProductID <= 0 {
		fields["productId"] = "productId must be a positive integer"
	}
	quantity, ok := normalizePositiveDecimal(request.Quantity)
	if !ok {
		fields["quantity"] = "quantity must be greater than zero"
	}
	unitPrice, ok := normalizeNonNegativeDecimal(request.UnitPrice)
	if !ok {
		fields["unitPrice"] = "unitPrice must be non-negative"
	}
	if err := newValidationError(fields); err != nil {
		return ContractProduct{}, err
	}

	active := true
	if request.Active != nil {
		active = *request.Active
	}
	return s.store.Create(ctx, CreateInput{
		ContractID:  contractID,
		ProductID:   request.ProductID,
		Quantity:    quantity,
		UnitPrice:   unitPrice,
		TotalAmount: calculateTotal(quantity, unitPrice),
		Notes:       strings.TrimSpace(request.Notes),
		Active:      active,
	})
}

func (s *Service) ListByContract(ctx context.Context, contractID int64, query ListQuery) (ListResult, error) {
	if contractID <= 0 {
		return ListResult{}, ValidationError{Fields: map[string]string{"contractId": "contractId must be a positive integer"}}
	}
	if query.Limit <= 0 {
		query.Limit = 50
	}
	if query.Limit > 100 {
		query.Limit = 100
	}
	return s.store.ListByContract(ctx, contractID, query)
}

func (s *Service) GetByID(ctx context.Context, contractID int64, id int64) (ContractProduct, error) {
	if contractID <= 0 || id <= 0 {
		return ContractProduct{}, ValidationError{Fields: map[string]string{"id": "contractId and id must be positive integers"}}
	}
	return s.store.GetByID(ctx, contractID, id)
}

func (s *Service) Update(ctx context.Context, contractID int64, id int64, request UpdateRequest) (ContractProduct, error) {
	fields := map[string]string{}
	if contractID <= 0 {
		fields["contractId"] = "contractId must be a positive integer"
	}
	if id <= 0 {
		fields["id"] = "id must be a positive integer"
	}
	input := UpdateInput{ProductID: request.ProductID, Active: request.Active}
	if request.ProductID != nil && *request.ProductID <= 0 {
		fields["productId"] = "productId must be a positive integer"
	}
	if request.Quantity != nil {
		quantity, ok := normalizePositiveDecimal(*request.Quantity)
		if !ok {
			fields["quantity"] = "quantity must be greater than zero"
		}
		input.Quantity = &quantity
	}
	if request.UnitPrice != nil {
		unitPrice, ok := normalizeNonNegativeDecimal(*request.UnitPrice)
		if !ok {
			fields["unitPrice"] = "unitPrice must be non-negative"
		}
		input.UnitPrice = &unitPrice
	}
	if request.Quantity != nil && request.UnitPrice != nil && len(fields) == 0 {
		total := calculateTotal(*input.Quantity, *input.UnitPrice)
		input.TotalAmount = &total
	}
	if request.Notes != nil {
		notes := strings.TrimSpace(*request.Notes)
		input.Notes = &notes
	}
	if input.IsEmpty() {
		fields["body"] = "at least one field must be provided"
	}
	if err := newValidationError(fields); err != nil {
		return ContractProduct{}, err
	}
	return s.store.Update(ctx, contractID, id, input)
}

func (s *Service) Delete(ctx context.Context, contractID int64, id int64) (ContractProduct, error) {
	if contractID <= 0 || id <= 0 {
		return ContractProduct{}, ValidationError{Fields: map[string]string{"id": "contractId and id must be positive integers"}}
	}
	return s.store.SoftDelete(ctx, contractID, id)
}

func normalizePositiveDecimal(value string) (string, bool) {
	n, ok := parseDecimal(value)
	if !ok || n <= 0 {
		return "", false
	}
	return fmt.Sprintf("%.2f", n), true
}

func normalizeNonNegativeDecimal(value string) (string, bool) {
	n, ok := parseDecimal(value)
	if !ok || n < 0 {
		return "", false
	}
	return fmt.Sprintf("%.2f", n), true
}

func parseDecimal(value string) (float64, bool) {
	n, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	return n, err == nil
}

func calculateTotal(quantity string, unitPrice string) string {
	q, _ := strconv.ParseFloat(quantity, 64)
	p, _ := strconv.ParseFloat(unitPrice, 64)
	return fmt.Sprintf("%.2f", q*p)
}
