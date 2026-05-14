package educationmodalities

import (
	"context"
	"strings"
)

const (
	defaultListLimit = 50
	maxListLimit     = 100
)

type Store interface {
	Create(context.Context, CreateInput) (EducationModality, error)
	GetByID(context.Context, int64) (EducationModality, error)
	List(context.Context, ListQuery) (ListResult, error)
	Update(context.Context, int64, UpdateInput) (EducationModality, error)
	SoftDelete(context.Context, int64) (EducationModality, error)
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, request CreateRequest) (EducationModality, error) {
	name := strings.TrimSpace(request.Name)
	fields := map[string]string{}
	if name == "" {
		fields["name"] = "name is required"
	}
	if err := newValidationError(fields); err != nil {
		return EducationModality{}, err
	}

	active := true
	if request.Active != nil {
		active = *request.Active
	}

	return s.store.Create(ctx, CreateInput{
		Name:        name,
		Description: optionalString(request.Description),
		Active:      active,
	})
}

func (s *Service) GetByID(ctx context.Context, id int64) (EducationModality, error) {
	return s.store.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, query ListQuery) (ListResult, error) {
	query.Search = strings.TrimSpace(query.Search)
	if query.Limit <= 0 {
		query.Limit = defaultListLimit
	}
	if query.Limit > maxListLimit {
		query.Limit = maxListLimit
	}
	return s.store.List(ctx, query)
}

func (s *Service) Update(ctx context.Context, id int64, request UpdateRequest) (EducationModality, error) {
	fields := map[string]string{}
	input := UpdateInput{Active: request.Active}
	if request.Name != nil {
		input.Name = trimRequired("name", *request.Name, fields)
	}
	if request.Description != nil {
		input.Description = optionalString(*request.Description)
	}
	if input.IsEmpty() {
		fields["body"] = "at least one field must be provided"
	}
	if err := newValidationError(fields); err != nil {
		return EducationModality{}, err
	}
	return s.store.Update(ctx, id, input)
}

func (s *Service) Delete(ctx context.Context, id int64) (EducationModality, error) {
	return s.store.SoftDelete(ctx, id)
}

func optionalString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func trimRequired(field string, value string, fields map[string]string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		fields[field] = field + " cannot be blank"
		return nil
	}
	return &value
}
