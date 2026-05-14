package products

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	input CreateRequest
	q     ListQuery
}

func (f *fakeStore) Create(ctx context.Context, in CreateRequest) (Product, error) {
	f.input = in
	return Product{ID: 1, Name: in.Name, Unit: in.Unit, Category: in.Category, Active: true}, nil
}
func (f *fakeStore) GetByID(context.Context, int64) (Product, error) { return Product{}, ErrNotFound }
func (f *fakeStore) List(ctx context.Context, q ListQuery) ([]Product, *int64, error) {
	f.q = q
	return nil, nil, nil
}
func (f *fakeStore) Update(context.Context, int64, UpdateRequest) (Product, error) {
	return Product{}, ErrNotFound
}
func (f *fakeStore) SoftDelete(context.Context, int64) (Product, error) {
	return Product{}, ErrNotFound
}
func TestCreateRequiresFields(t *testing.T) {
	_, err := NewService(&fakeStore{}).Create(context.Background(), CreateRequest{})
	var ve ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("want validation error")
	}
	for _, f := range []string{"name", "unit", "category"} {
		if ve.Fields[f] == "" {
			t.Fatalf("missing %s", f)
		}
	}
}
func TestCreateRejectsInvalidCorrectionFactor(t *testing.T) {
	bad := 0.0
	_, err := NewService(&fakeStore{}).Create(context.Background(), CreateRequest{
		Name:             "Arroz",
		Unit:             "kg",
		Category:         "Cereais",
		CorrectionFactor: &bad,
	})
	var ve ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("want validation error")
	}
	if ve.Fields["fator_correcao"] == "" {
		t.Fatalf("missing fator_correcao validation")
	}
}
func TestListCapsLimit(t *testing.T) {
	s := &fakeStore{}
	_, _, _ = NewService(s).List(context.Background(), ListQuery{Limit: 500})
	if s.q.Limit != 100 {
		t.Fatalf("limit=%d", s.q.Limit)
	}
}
