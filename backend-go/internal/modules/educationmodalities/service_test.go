package educationmodalities

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	createInput CreateInput
	listQuery   ListQuery
}

func (f *fakeStore) Create(ctx context.Context, input CreateInput) (EducationModality, error) {
	f.createInput = input
	return EducationModality{ID: 1, Name: input.Name, Description: input.Description, Active: input.Active}, nil
}
func (f *fakeStore) GetByID(context.Context, int64) (EducationModality, error) {
	return EducationModality{}, ErrNotFound
}
func (f *fakeStore) List(ctx context.Context, query ListQuery) (ListResult, error) {
	f.listQuery = query
	return ListResult{}, nil
}
func (f *fakeStore) Update(context.Context, int64, UpdateInput) (EducationModality, error) {
	return EducationModality{}, ErrNotFound
}
func (f *fakeStore) SoftDelete(context.Context, int64) (EducationModality, error) {
	return EducationModality{}, ErrNotFound
}

func TestCreateRequiresName(t *testing.T) {
	service := NewService(&fakeStore{})
	_, err := service.Create(context.Background(), CreateRequest{})
	var validationErr ValidationError
	if !errors.As(err, &validationErr) {
		t.Fatalf("error = %T, want ValidationError", err)
	}
	if validationErr.Fields["name"] == "" {
		t.Fatalf("fields = %#v, want name error", validationErr.Fields)
	}
}

func TestCreateTrimsNameAndDefaultsActive(t *testing.T) {
	store := &fakeStore{}
	service := NewService(store)
	item, err := service.Create(context.Background(), CreateRequest{Name: "  Elementary  "})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if store.createInput.Name != "Elementary" || item.Name != "Elementary" {
		t.Fatalf("name = %q/%q, want Elementary", store.createInput.Name, item.Name)
	}
	if !store.createInput.Active || !item.Active {
		t.Fatal("active default = false, want true")
	}
}

func TestListCapsLimit(t *testing.T) {
	store := &fakeStore{}
	service := NewService(store)
	_, err := service.List(context.Background(), ListQuery{Limit: 500})
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if store.listQuery.Limit != maxListLimit {
		t.Fatalf("limit = %d, want %d", store.listQuery.Limit, maxListLimit)
	}
}
