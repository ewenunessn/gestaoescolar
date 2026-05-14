package financialmodalities

import (
	"context"
	"errors"
	"strconv"
	"strings"
)

var (
	ErrNotFound = errors.New("financial modality not found")
	ErrConflict = errors.New("financial modality already exists")
)

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	Create(context.Context, CreateRequest) (FinancialModality, error)
	GetByID(context.Context, int64) (FinancialModality, error)
	List(context.Context, ListQuery) ([]FinancialModality, *int64, error)
	Update(context.Context, int64, UpdateRequest) (FinancialModality, error)
	SoftDelete(context.Context, int64) (FinancialModality, error)
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Create(ctx context.Context, r CreateRequest) (FinancialModality, error) {
	fields := map[string]string{}
	r.Name = strings.TrimSpace(r.Name)
	r.Code = strings.TrimSpace(r.Code)
	r.Description = strings.TrimSpace(r.Description)
	r.FundingSource = strings.TrimSpace(r.FundingSource)
	r.MonthlyAmount = strings.TrimSpace(r.MonthlyAmount)
	r.PaymentCode = strings.TrimSpace(r.PaymentCode)
	if r.Name == "" {
		fields["name"] = "name is required"
	}
	if r.Code == "" {
		fields["code"] = "code is required"
	}
	if r.FundingSource == "" {
		fields["fundingSource"] = "fundingSource is required"
	}
	if !validNonNegativeMoney(r.MonthlyAmount) {
		fields["monthlyAmount"] = "monthlyAmount must be non-negative"
	}
	if r.PaidInstallments < 0 {
		fields["paidInstallments"] = "paidInstallments cannot be negative"
	}
	if len(fields) > 0 {
		return FinancialModality{}, ValidationError{Fields: fields}
	}
	return s.store.Create(ctx, r)
}

func (s *Service) GetByID(ctx context.Context, id int64) (FinancialModality, error) {
	return s.store.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, q ListQuery) ([]FinancialModality, *int64, error) {
	q.Search = strings.TrimSpace(q.Search)
	if q.Limit <= 0 {
		q.Limit = 50
	}
	if q.Limit > 100 {
		q.Limit = 100
	}
	return s.store.List(ctx, q)
}

func (s *Service) Update(ctx context.Context, id int64, r UpdateRequest) (FinancialModality, error) {
	fields := map[string]string{}
	if r.Name != nil {
		v := strings.TrimSpace(*r.Name)
		if v == "" {
			fields["name"] = "name cannot be blank"
		}
		r.Name = &v
	}
	if r.Code != nil {
		v := strings.TrimSpace(*r.Code)
		if v == "" {
			fields["code"] = "code cannot be blank"
		}
		r.Code = &v
	}
	if r.Description != nil {
		v := strings.TrimSpace(*r.Description)
		r.Description = &v
	}
	if r.FundingSource != nil {
		v := strings.TrimSpace(*r.FundingSource)
		if v == "" {
			fields["fundingSource"] = "fundingSource cannot be blank"
		}
		r.FundingSource = &v
	}
	if r.MonthlyAmount != nil {
		v := strings.TrimSpace(*r.MonthlyAmount)
		if !validNonNegativeMoney(v) {
			fields["monthlyAmount"] = "monthlyAmount must be non-negative"
		}
		r.MonthlyAmount = &v
	}
	if r.PaymentCode != nil {
		v := strings.TrimSpace(*r.PaymentCode)
		r.PaymentCode = &v
	}
	if r.PaidInstallments != nil && *r.PaidInstallments < 0 {
		fields["paidInstallments"] = "paidInstallments cannot be negative"
	}
	if r.Name == nil && r.Code == nil && r.Description == nil && r.FundingSource == nil && r.MonthlyAmount == nil && r.PaymentCode == nil && r.PaidInstallments == nil && r.Active == nil {
		fields["body"] = "at least one field must be provided"
	}
	if len(fields) > 0 {
		return FinancialModality{}, ValidationError{Fields: fields}
	}
	return s.store.Update(ctx, id, r)
}

func (s *Service) Delete(ctx context.Context, id int64) (FinancialModality, error) {
	return s.store.SoftDelete(ctx, id)
}

func validNonNegativeMoney(value string) bool {
	n, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	return err == nil && n >= 0
}
