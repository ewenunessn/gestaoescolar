package menupreparations

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	input CreateRequest
	q     ListQuery
}

func (f *fakeStore) Create(_ context.Context, _ int64, in CreateRequest) (MenuPreparation, error) {
	f.input = in
	return MenuPreparation{ID: 1, Day: in.Day, MealID: in.MealID, PreparationID: in.PreparationID, Active: true}, nil
}
func (f *fakeStore) ListByMenu(_ context.Context, _ int64, q ListQuery) ([]MenuPreparation, *int64, error) {
	f.q = q
	return nil, nil, nil
}
func (f *fakeStore) GetByID(context.Context, int64, int64) (MenuPreparation, error) {
	return MenuPreparation{}, ErrNotFound
}
func (f *fakeStore) Update(context.Context, int64, int64, UpdateRequest) (MenuPreparation, error) {
	return MenuPreparation{}, ErrNotFound
}
func (f *fakeStore) SoftDelete(context.Context, int64, int64) (MenuPreparation, error) {
	return MenuPreparation{}, ErrNotFound
}

func TestCreateRequiresDayMealAndPreparation(t *testing.T) {
	_, err := NewService(&fakeStore{}).Create(context.Background(), 1, CreateRequest{})
	var ve ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("want validation error")
	}
	for _, field := range []string{"day", "mealId", "preparationId"} {
		if ve.Fields[field] == "" {
			t.Fatalf("missing %s", field)
		}
	}
}

func TestListCapsLimit(t *testing.T) {
	store := &fakeStore{}
	_, _, _ = NewService(store).ListByMenu(context.Background(), 1, ListQuery{Limit: 500})
	if store.q.Limit != 200 {
		t.Fatalf("limit=%d", store.q.Limit)
	}
}
