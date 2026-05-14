package schools

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	createInput CreateSchoolInput
	createValue School
	listQuery   ListSchoolsQuery
	listValue   ListSchoolsResult
}

func (f *fakeStore) Create(ctx context.Context, input CreateSchoolInput) (School, error) {
	f.createInput = input
	if f.createValue.ID == 0 {
		f.createValue = School{
			ID:     1,
			Name:   input.Name,
			Code:   input.Code,
			City:   input.City,
			Active: input.Active,
		}
	}
	return f.createValue, nil
}

func (f *fakeStore) GetByID(context.Context, int64) (School, error) {
	return School{}, ErrNotFound
}

func (f *fakeStore) List(ctx context.Context, query ListSchoolsQuery) (ListSchoolsResult, error) {
	f.listQuery = query
	return f.listValue, nil
}

func (f *fakeStore) Update(context.Context, int64, UpdateSchoolInput) (School, error) {
	return School{}, ErrNotFound
}

func (f *fakeStore) SoftDelete(context.Context, int64) (School, error) {
	return School{}, ErrNotFound
}

func TestCreateSchoolRequiresNameCodeAndCity(t *testing.T) {
	service := NewService(&fakeStore{})

	_, err := service.Create(context.Background(), CreateSchoolRequest{
		Name: "Municipal School",
		Code: "INEP-001",
	})

	var validationErr ValidationError
	if !errors.As(err, &validationErr) {
		t.Fatalf("error = %T, want ValidationError", err)
	}
	if validationErr.Fields["city"] == "" {
		t.Fatalf("validation fields = %#v, want city error", validationErr.Fields)
	}
}

func TestCreateSchoolTrimsStringsAndDefaultsActive(t *testing.T) {
	store := &fakeStore{}
	service := NewService(store)

	school, err := service.Create(context.Background(), CreateSchoolRequest{
		Name: "  Municipal School  ",
		Code: " INEP-001 ",
		City: "  Macapa ",
	})

	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if store.createInput.Name != "Municipal School" {
		t.Fatalf("Name = %q, want Municipal School", store.createInput.Name)
	}
	if store.createInput.Code != "INEP-001" {
		t.Fatalf("Code = %q, want INEP-001", store.createInput.Code)
	}
	if store.createInput.City != "Macapa" {
		t.Fatalf("City = %q, want Macapa", store.createInput.City)
	}
	if !store.createInput.Active || !school.Active {
		t.Fatal("active default = false, want true")
	}
}

func TestCreateSchoolPreservesOptionalFieldCasing(t *testing.T) {
	store := &fakeStore{}
	service := NewService(store)

	_, err := service.Create(context.Background(), CreateSchoolRequest{
		Name:        "Municipal School",
		Code:        "INEP-001",
		City:        "Macapa",
		Address:     "Test Street 123",
		ManagerName: "API Test Manager",
	})

	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if store.createInput.Address == nil || *store.createInput.Address != "Test Street 123" {
		t.Fatalf("Address = %#v, want Test Street 123", store.createInput.Address)
	}
	if store.createInput.ManagerName == nil || *store.createInput.ManagerName != "API Test Manager" {
		t.Fatalf("ManagerName = %#v, want API Test Manager", store.createInput.ManagerName)
	}
}

func TestListSchoolsCapsLimit(t *testing.T) {
	store := &fakeStore{}
	service := NewService(store)

	_, err := service.List(context.Background(), ListSchoolsQuery{
		Limit: 500,
	})

	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if store.listQuery.Limit != maxListLimit {
		t.Fatalf("Limit = %d, want %d", store.listQuery.Limit, maxListLimit)
	}
}
