package suppliers

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct{ q ListQuery }

func (f *fakeStore) Create(context.Context, CreateRequest) (Supplier, error) { return Supplier{}, nil }
func (f *fakeStore) GetByID(context.Context, int64) (Supplier, error)        { return Supplier{}, ErrNotFound }
func (f *fakeStore) List(ctx context.Context, q ListQuery) ([]Supplier, *int64, error) {
	f.q = q
	return nil, nil, nil
}
func (f *fakeStore) Update(context.Context, int64, UpdateRequest) (Supplier, error) {
	return Supplier{}, ErrNotFound
}
func (f *fakeStore) SoftDelete(context.Context, int64) (Supplier, error) {
	return Supplier{}, ErrNotFound
}
func TestCreateRequiresFields(t *testing.T) {
	_, err := NewService(&fakeStore{}).Create(context.Background(), CreateRequest{})
	var ve ValidationError
	if !errors.As(err, &ve) {
		t.Fatal("want validation")
	}
	for _, f := range []string{"name", "document", "supplierType"} {
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
