package preparationproducts

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

var (
	ErrNotFound = errors.New("preparation product not found")
	ErrConflict = errors.New("preparation already has this active product per capita")
)

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	Create(context.Context, CreateInput) (PreparationProduct, error)
	ListByPreparation(context.Context, int64, ListQuery) (ListResult, error)
	GetByID(context.Context, int64, int64) (PreparationProduct, error)
	Update(context.Context, int64, int64, UpdateInput) (PreparationProduct, error)
	SoftDelete(context.Context, int64, int64) (PreparationProduct, error)
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Create(ctx context.Context, preparationID int64, r CreateRequest) (PreparationProduct, error) {
	fields := map[string]string{}
	if preparationID <= 0 {
		fields["preparationId"] = "preparationId must be positive"
	}
	if r.ProductID <= 0 {
		fields["productId"] = "productId must be positive"
	}
	if r.EducationModalityID != nil && *r.EducationModalityID <= 0 {
		fields["educationModalityId"] = "educationModalityId must be positive"
	}
	amount, ok := normalizePositiveDecimal(r.PerCapitaAmount)
	if !ok {
		fields["perCapitaAmount"] = "perCapitaAmount must be greater than zero"
	}
	unit, ok := parseUnit(r.PerCapitaUnit)
	if !ok {
		fields["perCapitaUnit"] = "perCapitaUnit must be g or ml"
	}
	if len(fields) > 0 {
		return PreparationProduct{}, ValidationError{Fields: fields}
	}
	active := true
	if r.Active != nil {
		active = *r.Active
	}
	return s.store.Create(ctx, CreateInput{PreparationID: preparationID, ProductID: r.ProductID, EducationModalityID: r.EducationModalityID, PerCapitaAmount: amount, PerCapitaUnit: unit, Active: active})
}

func (s *Service) ListByPreparation(ctx context.Context, preparationID int64, q ListQuery) (ListResult, error) {
	if preparationID <= 0 {
		return ListResult{}, ValidationError{Fields: map[string]string{"preparationId": "preparationId must be positive"}}
	}
	if q.Limit <= 0 {
		q.Limit = 50
	}
	if q.Limit > 100 {
		q.Limit = 100
	}
	return s.store.ListByPreparation(ctx, preparationID, q)
}

func (s *Service) GetByID(ctx context.Context, preparationID int64, id int64) (PreparationProduct, error) {
	if preparationID <= 0 || id <= 0 {
		return PreparationProduct{}, ValidationError{Fields: map[string]string{"id": "preparationId and id must be positive"}}
	}
	return s.store.GetByID(ctx, preparationID, id)
}

func (s *Service) Update(ctx context.Context, preparationID int64, id int64, r UpdateRequest) (PreparationProduct, error) {
	fields := map[string]string{}
	if preparationID <= 0 {
		fields["preparationId"] = "preparationId must be positive"
	}
	if id <= 0 {
		fields["id"] = "id must be positive"
	}
	input := UpdateInput{ProductID: r.ProductID, EducationModalityID: r.EducationModalityID, Active: r.Active}
	if r.ProductID != nil && *r.ProductID <= 0 {
		fields["productId"] = "productId must be positive"
	}
	if r.EducationModalityID != nil && *r.EducationModalityID <= 0 {
		fields["educationModalityId"] = "educationModalityId must be positive"
	}
	if r.PerCapitaAmount != nil {
		amount, ok := normalizePositiveDecimal(*r.PerCapitaAmount)
		if !ok {
			fields["perCapitaAmount"] = "perCapitaAmount must be greater than zero"
		}
		input.PerCapitaAmount = &amount
	}
	if r.PerCapitaUnit != nil {
		unit, ok := parseUnit(*r.PerCapitaUnit)
		if !ok {
			fields["perCapitaUnit"] = "perCapitaUnit must be g or ml"
		}
		input.PerCapitaUnit = &unit
	}
	if input.IsEmpty() {
		fields["body"] = "at least one field must be provided"
	}
	if len(fields) > 0 {
		return PreparationProduct{}, ValidationError{Fields: fields}
	}
	return s.store.Update(ctx, preparationID, id, input)
}

func (s *Service) Delete(ctx context.Context, preparationID int64, id int64) (PreparationProduct, error) {
	if preparationID <= 0 || id <= 0 {
		return PreparationProduct{}, ValidationError{Fields: map[string]string{"id": "preparationId and id must be positive"}}
	}
	return s.store.SoftDelete(ctx, preparationID, id)
}

func parseUnit(value string) (PerCapitaUnit, bool) {
	unit := PerCapitaUnit(strings.TrimSpace(strings.ToLower(value)))
	switch unit {
	case PerCapitaUnitGram, PerCapitaUnitMilliliter:
		return unit, true
	default:
		return "", false
	}
}

func normalizePositiveDecimal(value string) (string, bool) {
	n, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	if err != nil || n <= 0 {
		return "", false
	}
	return fmt.Sprintf("%.2f", n), true
}
