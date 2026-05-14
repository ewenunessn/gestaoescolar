package meals

import (
	"context"
	"errors"
	"strings"
)

var (
	ErrNotFound = errors.New("meal not found")
	ErrConflict = errors.New("meal already exists")
)

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	Create(context.Context, CreateRequest) (Meal, error)
	GetByID(context.Context, int64) (Meal, error)
	List(context.Context, ListQuery) ([]Meal, *int64, error)
	Update(context.Context, int64, UpdateRequest) (Meal, error)
	SoftDelete(context.Context, int64) (Meal, error)
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Create(ctx context.Context, r CreateRequest) (Meal, error) {
	fields := map[string]string{}
	r.Name = strings.TrimSpace(r.Name)
	r.Code = strings.TrimSpace(strings.ToLower(r.Code))
	if r.Name == "" {
		fields["name"] = "name is required"
	}
	if r.Code == "" {
		fields["code"] = "code is required"
	}
	if r.SortOrder < 0 {
		fields["sortOrder"] = "sortOrder cannot be negative"
	}
	if len(fields) > 0 {
		return Meal{}, ValidationError{Fields: fields}
	}
	return s.store.Create(ctx, r)
}

func (s *Service) GetByID(ctx context.Context, id int64) (Meal, error) {
	if id <= 0 {
		return Meal{}, ValidationError{Fields: map[string]string{"id": "id must be positive"}}
	}
	return s.store.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, q ListQuery) ([]Meal, *int64, error) {
	q.Search = strings.TrimSpace(q.Search)
	if q.Limit <= 0 {
		q.Limit = 50
	}
	if q.Limit > 100 {
		q.Limit = 100
	}
	return s.store.List(ctx, q)
}

func (s *Service) Update(ctx context.Context, id int64, r UpdateRequest) (Meal, error) {
	fields := map[string]string{}
	if id <= 0 {
		fields["id"] = "id must be positive"
	}
	if r.Name != nil {
		v := strings.TrimSpace(*r.Name)
		if v == "" {
			fields["name"] = "name cannot be blank"
		}
		r.Name = &v
	}
	if r.Code != nil {
		v := strings.TrimSpace(strings.ToLower(*r.Code))
		if v == "" {
			fields["code"] = "code cannot be blank"
		}
		r.Code = &v
	}
	if r.SortOrder != nil && *r.SortOrder < 0 {
		fields["sortOrder"] = "sortOrder cannot be negative"
	}
	if r.Name == nil && r.Code == nil && r.SortOrder == nil && r.Active == nil {
		fields["body"] = "at least one field must be provided"
	}
	if len(fields) > 0 {
		return Meal{}, ValidationError{Fields: fields}
	}
	return s.store.Update(ctx, id, r)
}

func (s *Service) Delete(ctx context.Context, id int64) (Meal, error) {
	if id <= 0 {
		return Meal{}, ValidationError{Fields: map[string]string{"id": "id must be positive"}}
	}
	return s.store.SoftDelete(ctx, id)
}
