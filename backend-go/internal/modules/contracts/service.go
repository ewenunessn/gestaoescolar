package contracts

import (
	"context"
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound = errors.New("contract not found")
	ErrConflict = errors.New("contract already exists")
)

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	Create(context.Context, CreateRequest) (Contract, error)
	GetByID(context.Context, int64) (Contract, error)
	List(context.Context, ListQuery) ([]Contract, *int64, error)
	Update(context.Context, int64, UpdateRequest) (Contract, error)
	SoftDelete(context.Context, int64) (Contract, error)
}
type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }
func parseStatus(v string) (ContractStatus, bool) {
	s := ContractStatus(strings.TrimSpace(v))
	switch s {
	case StatusActive, StatusInactive, StatusSuspended, StatusFinished:
		return s, true
	default:
		return "", false
	}
}
func parseType(v string) (ContractType, bool) {
	t := ContractType(strings.TrimSpace(v))
	switch t {
	case TypeSupply, TypeService, TypeMixed:
		return t, true
	default:
		return "", false
	}
}
func validDate(v string) bool {
	_, err := time.Parse("2006-01-02", strings.TrimSpace(v))
	return err == nil
}
func (s *Service) Create(ctx context.Context, r CreateRequest) (Contract, error) {
	f := map[string]string{}
	r.Number = strings.TrimSpace(r.Number)
	r.StartDate = strings.TrimSpace(r.StartDate)
	r.EndDate = strings.TrimSpace(r.EndDate)
	if r.Status == "" {
		r.Status = string(StatusActive)
	}
	if r.ContractType == "" {
		r.ContractType = string(TypeSupply)
	}
	if r.Number == "" {
		f["number"] = "number is required"
	}
	if r.SupplierID <= 0 {
		f["supplierId"] = "supplierId must be positive"
	}
	if !validDate(r.StartDate) {
		f["startDate"] = "startDate must be YYYY-MM-DD"
	}
	if !validDate(r.EndDate) {
		f["endDate"] = "endDate must be YYYY-MM-DD"
	}
	if _, ok := parseStatus(r.Status); !ok {
		f["status"] = "invalid status"
	}
	if _, ok := parseType(r.ContractType); !ok {
		f["contractType"] = "invalid contractType"
	}
	if len(f) > 0 {
		return Contract{}, ValidationError{Fields: f}
	}
	return s.store.Create(ctx, r)
}
func (s *Service) GetByID(ctx context.Context, id int64) (Contract, error) {
	return s.store.GetByID(ctx, id)
}
func (s *Service) List(ctx context.Context, q ListQuery) ([]Contract, *int64, error) {
	q.Search = strings.TrimSpace(q.Search)
	if q.Limit <= 0 {
		q.Limit = 50
	}
	if q.Limit > 100 {
		q.Limit = 100
	}
	return s.store.List(ctx, q)
}
func (s *Service) Update(ctx context.Context, id int64, r UpdateRequest) (Contract, error) {
	f := map[string]string{}
	if r.Number != nil {
		v := strings.TrimSpace(*r.Number)
		if v == "" {
			f["number"] = "number cannot be blank"
		}
		r.Number = &v
	}
	if r.SupplierID != nil && *r.SupplierID <= 0 {
		f["supplierId"] = "supplierId must be positive"
	}
	if r.StartDate != nil {
		v := strings.TrimSpace(*r.StartDate)
		if !validDate(v) {
			f["startDate"] = "startDate must be YYYY-MM-DD"
		}
		r.StartDate = &v
	}
	if r.EndDate != nil {
		v := strings.TrimSpace(*r.EndDate)
		if !validDate(v) {
			f["endDate"] = "endDate must be YYYY-MM-DD"
		}
		r.EndDate = &v
	}
	if r.Status != nil {
		v := strings.TrimSpace(*r.Status)
		if _, ok := parseStatus(v); !ok {
			f["status"] = "invalid status"
		}
		r.Status = &v
	}
	if r.ContractType != nil {
		v := strings.TrimSpace(*r.ContractType)
		if _, ok := parseType(v); !ok {
			f["contractType"] = "invalid contractType"
		}
		r.ContractType = &v
	}
	if r.Notes != nil {
		v := strings.TrimSpace(*r.Notes)
		r.Notes = &v
	}
	if r.Number == nil && r.SupplierID == nil && r.StartDate == nil && r.EndDate == nil && r.Status == nil && r.ContractType == nil && r.Notes == nil && r.Active == nil {
		f["body"] = "at least one field must be provided"
	}
	if len(f) > 0 {
		return Contract{}, ValidationError{Fields: f}
	}
	return s.store.Update(ctx, id, r)
}
func (s *Service) Delete(ctx context.Context, id int64) (Contract, error) {
	return s.store.SoftDelete(ctx, id)
}
