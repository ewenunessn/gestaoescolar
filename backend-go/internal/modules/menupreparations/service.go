package menupreparations

import (
	"context"
	"errors"
	"strings"
)

var (
	ErrNotFound = errors.New("menu preparation not found")
	ErrConflict = errors.New("menu already has this preparation for the day and meal")
)

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	Create(context.Context, int64, CreateRequest) (MenuPreparation, error)
	ListByMenu(context.Context, int64, ListQuery) ([]MenuPreparation, *int64, error)
	GetByID(context.Context, int64, int64) (MenuPreparation, error)
	Update(context.Context, int64, int64, UpdateRequest) (MenuPreparation, error)
	SoftDelete(context.Context, int64, int64) (MenuPreparation, error)
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Create(ctx context.Context, menuID int64, r CreateRequest) (MenuPreparation, error) {
	fields := map[string]string{}
	if menuID <= 0 {
		fields["menuId"] = "menuId must be positive"
	}
	if r.Day < 1 || r.Day > 31 {
		fields["day"] = "day must be between 1 and 31"
	}
	if r.MealID <= 0 {
		fields["mealId"] = "mealId must be positive"
	}
	if r.PreparationID <= 0 {
		fields["preparationId"] = "preparationId must be positive"
	}
	r.Notes = strings.TrimSpace(r.Notes)
	if len(fields) > 0 {
		return MenuPreparation{}, ValidationError{Fields: fields}
	}
	return s.store.Create(ctx, menuID, r)
}

func (s *Service) ListByMenu(ctx context.Context, menuID int64, q ListQuery) ([]MenuPreparation, *int64, error) {
	if menuID <= 0 {
		return nil, nil, ValidationError{Fields: map[string]string{"menuId": "menuId must be positive"}}
	}
	if q.Day != nil && (*q.Day < 1 || *q.Day > 31) {
		return nil, nil, ValidationError{Fields: map[string]string{"day": "day must be between 1 and 31"}}
	}
	if q.Limit <= 0 {
		q.Limit = 100
	}
	if q.Limit > 200 {
		q.Limit = 200
	}
	return s.store.ListByMenu(ctx, menuID, q)
}

func (s *Service) GetByID(ctx context.Context, menuID int64, id int64) (MenuPreparation, error) {
	if menuID <= 0 || id <= 0 {
		return MenuPreparation{}, ValidationError{Fields: map[string]string{"id": "menuId and id must be positive"}}
	}
	return s.store.GetByID(ctx, menuID, id)
}

func (s *Service) Update(ctx context.Context, menuID int64, id int64, r UpdateRequest) (MenuPreparation, error) {
	fields := map[string]string{}
	if menuID <= 0 || id <= 0 {
		fields["id"] = "menuId and id must be positive"
	}
	if r.Day != nil && (*r.Day < 1 || *r.Day > 31) {
		fields["day"] = "day must be between 1 and 31"
	}
	if r.MealID != nil && *r.MealID <= 0 {
		fields["mealId"] = "mealId must be positive"
	}
	if r.PreparationID != nil && *r.PreparationID <= 0 {
		fields["preparationId"] = "preparationId must be positive"
	}
	if r.Notes != nil {
		v := strings.TrimSpace(*r.Notes)
		r.Notes = &v
	}
	if r.Day == nil && r.MealID == nil && r.PreparationID == nil && r.Notes == nil && r.Active == nil {
		fields["body"] = "at least one field must be provided"
	}
	if len(fields) > 0 {
		return MenuPreparation{}, ValidationError{Fields: fields}
	}
	return s.store.Update(ctx, menuID, id, r)
}

func (s *Service) Delete(ctx context.Context, menuID int64, id int64) (MenuPreparation, error) {
	if menuID <= 0 || id <= 0 {
		return MenuPreparation{}, ValidationError{Fields: map[string]string{"id": "menuId and id must be positive"}}
	}
	return s.store.SoftDelete(ctx, menuID, id)
}
