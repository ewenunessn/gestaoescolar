package preparationproducts

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	created CreateInput
	q       ListQuery
}

func (f *fakeStore) Create(_ context.Context, in CreateInput) (PreparationProduct, error) {
	f.created = in
	return PreparationProduct{ID: 1, PreparationID: in.PreparationID, ProductID: in.ProductID, EducationModalityID: in.EducationModalityID, PerCapitaAmount: in.PerCapitaAmount, PerCapitaUnit: in.PerCapitaUnit, Active: in.Active}, nil
}
func (f *fakeStore) ListByPreparation(_ context.Context, _ int64, q ListQuery) (ListResult, error) {
	f.q = q
	return ListResult{}, nil
}
func (f *fakeStore) GetByID(context.Context, int64, int64) (PreparationProduct, error) {
	return PreparationProduct{}, ErrNotFound
}
func (f *fakeStore) Update(context.Context, int64, int64, UpdateInput) (PreparationProduct, error) {
	return PreparationProduct{}, ErrNotFound
}
func (f *fakeStore) SoftDelete(context.Context, int64, int64) (PreparationProduct, error) {
	return PreparationProduct{}, ErrNotFound
}

func TestCreateRejectsInvalidFields(t *testing.T) {
	_, err := NewService(&fakeStore{}).Create(context.Background(), 0, CreateRequest{PerCapitaAmount: "-1", PerCapitaUnit: "kg"})
	var ve ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("want validation error")
	}
	for _, field := range []string{"preparationId", "productId", "perCapitaAmount", "perCapitaUnit"} {
		if ve.Fields[field] == "" {
			t.Fatalf("missing %s validation in %#v", field, ve.Fields)
		}
	}
}

func TestCreateAcceptsGeneralAndModalityPerCapita(t *testing.T) {
	store := &fakeStore{}
	item, err := NewService(store).Create(context.Background(), 10, CreateRequest{ProductID: 20, PerCapitaAmount: "80", PerCapitaUnit: "g"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if item.EducationModalityID != nil || item.PerCapitaAmount != "80.00" || item.PerCapitaUnit != "g" {
		t.Fatalf("unexpected item %#v", item)
	}

	modalityID := int64(30)
	item, err = NewService(store).Create(context.Background(), 10, CreateRequest{ProductID: 20, EducationModalityID: &modalityID, PerCapitaAmount: "120", PerCapitaUnit: "ml"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if item.EducationModalityID == nil || *item.EducationModalityID != modalityID || item.PerCapitaUnit != "ml" {
		t.Fatalf("unexpected modality item %#v", item)
	}
}

func TestListCapsLimit(t *testing.T) {
	store := &fakeStore{}
	_, _ = NewService(store).ListByPreparation(context.Background(), 1, ListQuery{Limit: 500})
	if store.q.Limit != 100 {
		t.Fatalf("limit=%d, want 100", store.q.Limit)
	}
}
