package contractproducts

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	created CreateInput
	updated UpdateInput
}

func (s *fakeStore) Create(_ context.Context, input CreateInput) (ContractProduct, error) {
	s.created = input
	return ContractProduct{ID: 1, ContractID: input.ContractID, ProductID: input.ProductID, Quantity: input.Quantity, UnitPrice: input.UnitPrice, TotalAmount: input.TotalAmount, Active: input.Active}, nil
}

func (s *fakeStore) ListByContract(context.Context, int64, ListQuery) (ListResult, error) {
	return ListResult{}, nil
}

func (s *fakeStore) GetByID(_ context.Context, contractID int64, id int64) (ContractProduct, error) {
	return ContractProduct{ID: id, ContractID: contractID}, nil
}

func (s *fakeStore) Update(_ context.Context, _ int64, _ int64, input UpdateInput) (ContractProduct, error) {
	s.updated = input
	return ContractProduct{ID: 1}, nil
}

func (s *fakeStore) SoftDelete(context.Context, int64, int64) (ContractProduct, error) {
	return ContractProduct{ID: 1, Active: false}, nil
}

func TestCreateRejectsInvalidFields(t *testing.T) {
	service := NewService(&fakeStore{})

	_, err := service.Create(context.Background(), 0, CreateRequest{
		ProductID: 0,
		Quantity:  "-1",
		UnitPrice: "-5",
	})

	var validationErr ValidationError
	if !errors.As(err, &validationErr) {
		t.Fatalf("expected validation error, got %v", err)
	}
	for _, field := range []string{"contractId", "productId", "quantity", "unitPrice"} {
		if validationErr.Fields[field] == "" {
			t.Fatalf("expected field %s in validation response, got %#v", field, validationErr.Fields)
		}
	}
}

func TestCreateCalculatesTotalAmountAndDefaultsActive(t *testing.T) {
	store := &fakeStore{}
	service := NewService(store)

	item, err := service.Create(context.Background(), 10, CreateRequest{
		ProductID: 20,
		Quantity:  "3",
		UnitPrice: "12.50",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if item.TotalAmount != "37.50" {
		t.Fatalf("expected total amount 37.50, got %q", item.TotalAmount)
	}
	if !store.created.Active {
		t.Fatalf("expected active default to true")
	}
}

func TestUpdateRequiresAtLeastOneField(t *testing.T) {
	service := NewService(&fakeStore{})

	_, err := service.Update(context.Background(), 1, 1, UpdateRequest{})

	var validationErr ValidationError
	if !errors.As(err, &validationErr) {
		t.Fatalf("expected validation error, got %v", err)
	}
	if validationErr.Fields["body"] == "" {
		t.Fatalf("expected body validation error, got %#v", validationErr.Fields)
	}
}
