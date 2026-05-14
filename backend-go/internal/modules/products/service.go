package products

import (
	"context"
	"errors"
	"strings"
)

var (
	ErrNotFound = errors.New("product not found")
	ErrConflict = errors.New("product already exists")
)

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	Create(context.Context, CreateRequest) (Product, error)
	GetByID(context.Context, int64) (Product, error)
	List(context.Context, ListQuery) ([]Product, *int64, error)
	Update(context.Context, int64, UpdateRequest) (Product, error)
	SoftDelete(context.Context, int64) (Product, error)
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Create(ctx context.Context, r CreateRequest) (Product, error) {
	fields := map[string]string{}
	r.Name, r.Unit, r.Category = strings.TrimSpace(r.Name), strings.TrimSpace(r.Unit), strings.TrimSpace(r.Category)
	r.Description = strings.TrimSpace(r.Description)
	if r.Name == "" {
		fields["name"] = "name is required"
	}
	if r.Unit == "" {
		fields["unit"] = "unit is required"
	}
	if r.Category == "" {
		fields["category"] = "category is required"
	}
	if r.CorrectionFactor != nil && *r.CorrectionFactor <= 0 {
		fields["fator_correcao"] = "fator_correcao must be greater than zero"
	}
	if len(fields) > 0 {
		return Product{}, ValidationError{Fields: fields}
	}
	return s.store.Create(ctx, r)
}
func (s *Service) GetByID(ctx context.Context, id int64) (Product, error) {
	return s.store.GetByID(ctx, id)
}
func (s *Service) List(ctx context.Context, q ListQuery) ([]Product, *int64, error) {
	q.Search = strings.TrimSpace(q.Search)
	if q.Limit <= 0 {
		q.Limit = 50
	}
	if q.Limit > 100 {
		q.Limit = 100
	}
	return s.store.List(ctx, q)
}
func (s *Service) Update(ctx context.Context, id int64, r UpdateRequest) (Product, error) {
	fields := map[string]string{}
	if r.Name != nil {
		v := strings.TrimSpace(*r.Name)
		if v == "" {
			fields["name"] = "name cannot be blank"
		}
		r.Name = &v
	}
	if r.Unit != nil {
		v := strings.TrimSpace(*r.Unit)
		if v == "" {
			fields["unit"] = "unit cannot be blank"
		}
		r.Unit = &v
	}
	if r.Category != nil {
		v := strings.TrimSpace(*r.Category)
		if v == "" {
			fields["category"] = "category cannot be blank"
		}
		r.Category = &v
	}
	if r.Description != nil {
		v := strings.TrimSpace(*r.Description)
		r.Description = &v
	}
	if r.CorrectionFactor != nil && *r.CorrectionFactor <= 0 {
		fields["fator_correcao"] = "fator_correcao must be greater than zero"
	}
	if r.Name == nil && r.Unit == nil && r.Category == nil && r.Description == nil && r.CorrectionFactor == nil && r.Active == nil {
		fields["body"] = "at least one field must be provided"
	}
	if len(fields) > 0 {
		return Product{}, ValidationError{Fields: fields}
	}
	return s.store.Update(ctx, id, r)
}
func (s *Service) Delete(ctx context.Context, id int64) (Product, error) {
	return s.store.SoftDelete(ctx, id)
}
