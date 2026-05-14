package contractbalanceentries

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"
)

var (
	ErrNotFound = errors.New("contract balance entry not found")
)

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	Create(context.Context, int64, CreateRequest) (ContractBalanceEntry, error)
	GetByID(context.Context, int64, int64) (ContractBalanceEntry, error)
	List(context.Context, int64, ListQuery) ([]ContractBalanceEntry, *int64, error)
	Summary(context.Context, int64) ([]BalanceSummaryItem, error)
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Create(ctx context.Context, contractID int64, r CreateRequest) (ContractBalanceEntry, error) {
	fields := validateContractID(contractID)
	if r.ContractProductID <= 0 {
		fields["contractProductId"] = "contractProductId must be positive"
	}
	controlType, ok := parseControlType(r.ControlType)
	if !ok {
		fields["controlType"] = "invalid controlType"
	}
	entryType, ok := parseEntryType(r.EntryType)
	if !ok {
		fields["entryType"] = "invalid entryType"
	}
	if !validPositiveMoney(r.Amount) {
		fields["amount"] = "amount must be greater than zero"
	}
	r.Quantity = strings.TrimSpace(r.Quantity)
	if r.Quantity != "" && !validNonNegativeMoney(r.Quantity) {
		fields["quantity"] = "quantity must be non-negative"
	}
	r.OccurredAt = strings.TrimSpace(r.OccurredAt)
	if _, err := time.Parse("2006-01-02", r.OccurredAt); err != nil {
		fields["occurredAt"] = "occurredAt must be YYYY-MM-DD"
	}
	if controlType == ControlTypeItem && r.FinancialModalityID != nil {
		fields["financialModalityId"] = "financialModalityId must be empty when controlType is item"
	}
	if controlType == ControlTypeItemFinancialModality && (r.FinancialModalityID == nil || *r.FinancialModalityID <= 0) {
		fields["financialModalityId"] = "financialModalityId is required when controlType is item_financial_modality"
	}
	if len(fields) > 0 {
		return ContractBalanceEntry{}, ValidationError{Fields: fields}
	}
	r.ControlType = string(controlType)
	r.EntryType = string(entryType)
	r.Amount = strings.TrimSpace(r.Amount)
	r.Description = strings.TrimSpace(r.Description)
	r.ReferenceDocument = strings.TrimSpace(r.ReferenceDocument)
	return s.store.Create(ctx, contractID, r)
}

func (s *Service) GetByID(ctx context.Context, contractID int64, id int64) (ContractBalanceEntry, error) {
	fields := validateContractID(contractID)
	if id <= 0 {
		fields["id"] = "id must be positive"
	}
	if len(fields) > 0 {
		return ContractBalanceEntry{}, ValidationError{Fields: fields}
	}
	return s.store.GetByID(ctx, contractID, id)
}

func (s *Service) List(ctx context.Context, contractID int64, q ListQuery) ([]ContractBalanceEntry, *int64, error) {
	fields := validateContractID(contractID)
	if q.ContractProductID != nil && *q.ContractProductID <= 0 {
		fields["contractProductId"] = "contractProductId must be positive"
	}
	if q.FinancialModalityID != nil && *q.FinancialModalityID <= 0 {
		fields["financialModalityId"] = "financialModalityId must be positive"
	}
	if q.EntryType != nil {
		if _, ok := parseEntryType(string(*q.EntryType)); !ok {
			fields["entryType"] = "invalid entryType"
		}
	}
	if len(fields) > 0 {
		return nil, nil, ValidationError{Fields: fields}
	}
	if q.Limit <= 0 {
		q.Limit = 50
	}
	if q.Limit > 100 {
		q.Limit = 100
	}
	return s.store.List(ctx, contractID, q)
}

func (s *Service) Summary(ctx context.Context, contractID int64) ([]BalanceSummaryItem, error) {
	if fields := validateContractID(contractID); len(fields) > 0 {
		return nil, ValidationError{Fields: fields}
	}
	return s.store.Summary(ctx, contractID)
}

func parseControlType(value string) (ControlType, bool) {
	controlType := ControlType(strings.TrimSpace(value))
	switch controlType {
	case ControlTypeItem, ControlTypeItemFinancialModality:
		return controlType, true
	default:
		return "", false
	}
}

func parseEntryType(value string) (EntryType, bool) {
	entryType := EntryType(strings.TrimSpace(value))
	switch entryType {
	case EntryTypeInitialBalance, EntryTypeConsumption, EntryTypeReversal, EntryTypeAddendum:
		return entryType, true
	default:
		return "", false
	}
}

func validateContractID(contractID int64) map[string]string {
	fields := map[string]string{}
	if contractID <= 0 {
		fields["contractId"] = "contractId must be positive"
	}
	return fields
}

func validPositiveMoney(value string) bool {
	n, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	return err == nil && n > 0
}

func validNonNegativeMoney(value string) bool {
	n, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	return err == nil && n >= 0
}
