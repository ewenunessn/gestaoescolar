package meals

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	input CreateRequest
	q     ListQuery
}

func (f *fakeStore) Create(_ context.Context, in CreateRequest) (Meal, error) {
	f.input = in
	return Meal{ID: 1, Name: in.Name, Code: in.Code, SortOrder: in.SortOrder, Active: true}, nil
}
func (f *fakeStore) GetByID(context.Context, int64) (Meal, error) { return Meal{}, ErrNotFound }
func (f *fakeStore) List(_ context.Context, q ListQuery) ([]Meal, *int64, error) {
	f.q = q
	return nil, nil, nil
}
func (f *fakeStore) Update(context.Context, int64, UpdateRequest) (Meal, error) {
	return Meal{}, ErrNotFound
}
func (f *fakeStore) SoftDelete(context.Context, int64) (Meal, error) { return Meal{}, ErrNotFound }

func TestCreateRequiresNameAndCode(t *testing.T) {
	_, err := NewService(&fakeStore{}).Create(context.Background(), CreateRequest{})
	var ve ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("want validation error")
	}
	for _, field := range []string{"name", "code"} {
		if ve.Fields[field] == "" {
			t.Fatalf("missing %s", field)
		}
	}
}

func TestListCapsLimit(t *testing.T) {
	store := &fakeStore{}
	_, _, _ = NewService(store).List(context.Background(), ListQuery{Limit: 500})
	if store.q.Limit != 100 {
		t.Fatalf("limit=%d", store.q.Limit)
	}
}
