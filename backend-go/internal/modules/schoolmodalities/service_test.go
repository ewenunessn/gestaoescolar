package schoolmodalities

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	createInput CreateInput
}

func (f *fakeStore) Create(ctx context.Context, input CreateInput) (SchoolEducationModality, error) {
	f.createInput = input
	return SchoolEducationModality{ID: 1, SchoolID: input.SchoolID, EducationModalityID: input.EducationModalityID, StudentCount: input.StudentCount, Active: input.Active}, nil
}
func (f *fakeStore) ListBySchool(context.Context, int64, ListQuery) (ListResult, error) {
	return ListResult{}, nil
}
func (f *fakeStore) Update(context.Context, int64, int64, UpdateInput) (SchoolEducationModality, error) {
	return SchoolEducationModality{}, ErrNotFound
}
func (f *fakeStore) SoftDelete(context.Context, int64, int64) (SchoolEducationModality, error) {
	return SchoolEducationModality{}, ErrNotFound
}

func TestCreateValidatesPositiveIDsAndStudentCount(t *testing.T) {
	service := NewService(&fakeStore{})
	_, err := service.Create(context.Background(), 0, CreateRequest{StudentCount: -1})
	var validationErr ValidationError
	if !errors.As(err, &validationErr) {
		t.Fatalf("error = %T, want ValidationError", err)
	}
	for _, field := range []string{"schoolId", "educationModalityId", "studentCount"} {
		if validationErr.Fields[field] == "" {
			t.Fatalf("fields = %#v, want %s error", validationErr.Fields, field)
		}
	}
}

func TestCreateDefaultsActive(t *testing.T) {
	store := &fakeStore{}
	service := NewService(store)
	item, err := service.Create(context.Background(), 10, CreateRequest{EducationModalityID: 20, StudentCount: 30})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if !store.createInput.Active || !item.Active {
		t.Fatal("active default = false, want true")
	}
}
