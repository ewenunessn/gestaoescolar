package contractbalanceentries

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	input CreateRequest
	q     ListQuery
}

func (f *fakeStore) Create(_ context.Context, _ int64, in CreateRequest) (ContractBalanceEntry, error) {
	f.input = in
	return ContractBalanceEntry{ID: 1, ContractProductID: in.ContractProductID, ControlType: ControlType(in.ControlType), EntryType: EntryType(in.EntryType), Amount: in.Amount}, nil
}
func (f *fakeStore) GetByID(context.Context, int64, int64) (ContractBalanceEntry, error) {
	return ContractBalanceEntry{}, ErrNotFound
}
func (f *fakeStore) List(_ context.Context, _ int64, q ListQuery) ([]ContractBalanceEntry, *int64, error) {
	f.q = q
	return nil, nil, nil
}
func (f *fakeStore) Summary(context.Context, int64) ([]BalanceSummaryItem, error) {
	return nil, nil
}

func TestCreateRequiresFinancialModalityWhenControlTypeRequiresIt(t *testing.T) {
	_, err := NewService(&fakeStore{}).Create(context.Background(), 1, CreateRequest{
		ContractProductID: 1,
		ControlType:       "item_financial_modality",
		EntryType:         "consumption",
		Amount:            "10.00",
		OccurredAt:        "2026-05-12",
	})
	var ve ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("want validation error")
	}
	if ve.Fields["financialModalityId"] == "" {
		t.Fatalf("missing financialModalityId validation in %#v", ve.Fields)
	}
}

func TestCreateAcceptsItemControlWithoutFinancialModality(t *testing.T) {
	store := &fakeStore{}
	_, err := NewService(store).Create(context.Background(), 1, CreateRequest{
		ContractProductID: 1,
		ControlType:       "item",
		EntryType:         "addendum",
		Amount:            "100.00",
		OccurredAt:        "2026-05-12",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if store.input.ControlType != "item" {
		t.Fatalf("controlType=%q", store.input.ControlType)
	}
}

func TestListCapsLimit(t *testing.T) {
	store := &fakeStore{}
	_, _, _ = NewService(store).List(context.Background(), 1, ListQuery{Limit: 500})
	if store.q.Limit != 100 {
		t.Fatalf("limit=%d, want 100", store.q.Limit)
	}
}
