package menus

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	input CreateInput
	q     ListQuery
}

func (f *fakeStore) Create(_ context.Context, in CreateInput) (Menu, error) {
	f.input = in
	return Menu{ID: 1, Name: in.Name, Year: in.Year, Month: in.Month, StartDate: in.StartDate, EndDate: in.EndDate, EducationModalityIDs: in.EducationModalityIDs, Active: in.Active}, nil
}
func (f *fakeStore) GetByID(context.Context, int64) (Menu, error) { return Menu{}, ErrNotFound }
func (f *fakeStore) List(_ context.Context, q ListQuery) ([]Menu, *int64, error) {
	f.q = q
	return nil, nil, nil
}
func (f *fakeStore) Update(context.Context, int64, UpdateInput) (Menu, error) {
	return Menu{}, ErrNotFound
}
func (f *fakeStore) SoftDelete(context.Context, int64) (Menu, error) { return Menu{}, ErrNotFound }

func TestCreateRequiresCoreFields(t *testing.T) {
	_, err := NewService(&fakeStore{}).Create(context.Background(), CreateRequest{})
	var ve ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("want validation error")
	}
	for _, field := range []string{"name", "year", "month", "startDate", "endDate", "educationModalityIds"} {
		if ve.Fields[field] == "" {
			t.Fatalf("missing %s", field)
		}
	}
}

func TestCreateAcceptsValidMenu(t *testing.T) {
	store := &fakeStore{}
	_, err := NewService(store).Create(context.Background(), CreateRequest{Name: "Maio", Year: 2026, Month: 5, StartDate: "2026-05-01", EndDate: "2026-05-31", EducationModalityIDs: []int64{2, 2}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(store.input.EducationModalityIDs) != 1 || store.input.EducationModalityIDs[0] != 2 {
		t.Fatalf("modalities=%v", store.input.EducationModalityIDs)
	}
}
