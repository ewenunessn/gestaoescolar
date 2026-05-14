package preparations

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	input CreateRequest
	q     ListQuery
}

func (f *fakeStore) Create(_ context.Context, in CreateRequest) (Preparation, error) {
	f.input = in
	return Preparation{ID: 1, Name: in.Name, PreparationType: in.PreparationType, Active: true}, nil
}
func (f *fakeStore) GetByID(context.Context, int64) (Preparation, error) {
	return Preparation{}, ErrNotFound
}
func (f *fakeStore) List(_ context.Context, q ListQuery) ([]Preparation, *int64, error) {
	f.q = q
	return nil, nil, nil
}
func (f *fakeStore) Update(context.Context, int64, UpdateRequest) (Preparation, error) {
	return Preparation{}, ErrNotFound
}
func (f *fakeStore) SoftDelete(context.Context, int64) (Preparation, error) {
	return Preparation{}, ErrNotFound
}

func TestCreateRequiresNameAndType(t *testing.T) {
	_, err := NewService(&fakeStore{}).Create(context.Background(), CreateRequest{})
	var ve ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("want validation error")
	}
	for _, field := range []string{"name", "preparationType"} {
		if ve.Fields[field] == "" {
			t.Fatalf("missing %s validation in %#v", field, ve.Fields)
		}
	}
}

func TestListCapsLimit(t *testing.T) {
	store := &fakeStore{}
	_, _, _ = NewService(store).List(context.Background(), ListQuery{Limit: 500})
	if store.q.Limit != 100 {
		t.Fatalf("limit=%d, want 100", store.q.Limit)
	}
}
