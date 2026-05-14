package contracts

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct{ q ListQuery }

func (f *fakeStore) Create(context.Context, CreateRequest) (Contract, error) { return Contract{}, nil }
func (f *fakeStore) GetByID(context.Context, int64) (Contract, error)        { return Contract{}, ErrNotFound }
func (f *fakeStore) List(ctx context.Context, q ListQuery) ([]Contract, *int64, error) {
	f.q = q
	return nil, nil, nil
}
func (f *fakeStore) Update(context.Context, int64, UpdateRequest) (Contract, error) {
	return Contract{}, ErrNotFound
}
func (f *fakeStore) SoftDelete(context.Context, int64) (Contract, error) {
	return Contract{}, ErrNotFound
}
func TestCreateValidatesRequiredFields(t *testing.T) {
	_, err := NewService(&fakeStore{}).Create(context.Background(), CreateRequest{})
	var ve ValidationError
	if !errors.As(err, &ve) {
		t.Fatal("want validation")
	}
	for _, f := range []string{"number", "supplierId", "startDate", "endDate"} {
		if ve.Fields[f] == "" {
			t.Fatalf("missing %s", f)
		}
	}
}
func TestListCapsLimit(t *testing.T) {
	s := &fakeStore{}
	_, _, _ = NewService(s).List(context.Background(), ListQuery{Limit: 500})
	if s.q.Limit != 100 {
		t.Fatalf("limit=%d", s.q.Limit)
	}
}
