package preparations

import (
	"context"
	"errors"
	"strings"
)

var (
	ErrNotFound = errors.New("preparation not found")
	ErrConflict = errors.New("preparation already exists")
)

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	Create(context.Context, CreateRequest) (Preparation, error)
	GetByID(context.Context, int64) (Preparation, error)
	List(context.Context, ListQuery) ([]Preparation, *int64, error)
	Update(context.Context, int64, UpdateRequest) (Preparation, error)
	SoftDelete(context.Context, int64) (Preparation, error)
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Create(ctx context.Context, r CreateRequest) (Preparation, error) {
	fields := map[string]string{}
	r.Name = strings.TrimSpace(r.Name)
	r.Description = strings.TrimSpace(r.Description)
	r.PreparationType = strings.TrimSpace(r.PreparationType)
	if r.Name == "" {
		fields["name"] = "name is required"
	}
	if r.PreparationType == "" {
		fields["preparationType"] = "preparationType is required"
	}
	if len(fields) > 0 {
		return Preparation{}, ValidationError{Fields: fields}
	}
	return s.store.Create(ctx, r)
}

func (s *Service) GetByID(ctx context.Context, id int64) (Preparation, error) {
	return s.store.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, q ListQuery) ([]Preparation, *int64, error) {
	q.Search = strings.TrimSpace(q.Search)
	if q.Limit <= 0 {
		q.Limit = 50
	}
	if q.Limit > 100 {
		q.Limit = 100
	}
	return s.store.List(ctx, q)
}

func (s *Service) Update(ctx context.Context, id int64, r UpdateRequest) (Preparation, error) {
	fields := map[string]string{}
	if r.Name != nil {
		v := strings.TrimSpace(*r.Name)
		if v == "" {
			fields["name"] = "name cannot be blank"
		}
		r.Name = &v
	}
	if r.Description != nil {
		v := strings.TrimSpace(*r.Description)
		r.Description = &v
	}
	if r.PreparationType != nil {
		v := strings.TrimSpace(*r.PreparationType)
		if v == "" {
			fields["preparationType"] = "preparationType cannot be blank"
		}
		r.PreparationType = &v
	}
	if r.Name == nil && r.Description == nil && r.PreparationType == nil && r.Active == nil {
		fields["body"] = "at least one field must be provided"
	}
	if len(fields) > 0 {
		return Preparation{}, ValidationError{Fields: fields}
	}
	return s.store.Update(ctx, id, r)
}

func (s *Service) Delete(ctx context.Context, id int64) (Preparation, error) {
	return s.store.SoftDelete(ctx, id)
}
