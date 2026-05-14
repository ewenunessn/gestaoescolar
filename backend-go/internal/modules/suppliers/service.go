package suppliers

import (
	"context"
	"errors"
	"strings"
)

var (
	ErrNotFound = errors.New("supplier not found")
	ErrConflict = errors.New("supplier already exists")
)

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	Create(context.Context, CreateRequest) (Supplier, error)
	GetByID(context.Context, int64) (Supplier, error)
	List(context.Context, ListQuery) ([]Supplier, *int64, error)
	Update(context.Context, int64, UpdateRequest) (Supplier, error)
	SoftDelete(context.Context, int64) (Supplier, error)
}
type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }
func parseType(v string) (SupplierType, bool) {
	t := SupplierType(strings.TrimSpace(v))
	switch t {
	case SupplierTypeFamilyFarming, SupplierTypeCooperative, SupplierTypeConventional, SupplierTypeIndividual, SupplierTypeOther:
		return t, true
	default:
		return "", false
	}
}
func cleanPtr(p *string) *string {
	if p == nil {
		return nil
	}
	v := strings.TrimSpace(*p)
	return &v
}
func (s *Service) Create(ctx context.Context, r CreateRequest) (Supplier, error) {
	fields := map[string]string{}
	r.Name = strings.TrimSpace(r.Name)
	r.Document = strings.TrimSpace(r.Document)
	r.SupplierType = strings.TrimSpace(r.SupplierType)
	if r.Name == "" {
		fields["name"] = "name is required"
	}
	if r.Document == "" {
		fields["document"] = "document is required"
	}
	if _, ok := parseType(r.SupplierType); !ok {
		fields["supplierType"] = "supplierType must be family_farming, cooperative, conventional, individual, or other"
	}
	if len(fields) > 0 {
		return Supplier{}, ValidationError{Fields: fields}
	}
	return s.store.Create(ctx, r)
}
func (s *Service) GetByID(ctx context.Context, id int64) (Supplier, error) {
	return s.store.GetByID(ctx, id)
}
func (s *Service) List(ctx context.Context, q ListQuery) ([]Supplier, *int64, error) {
	q.Search = strings.TrimSpace(q.Search)
	if q.Limit <= 0 {
		q.Limit = 50
	}
	if q.Limit > 100 {
		q.Limit = 100
	}
	return s.store.List(ctx, q)
}
func (s *Service) Update(ctx context.Context, id int64, r UpdateRequest) (Supplier, error) {
	fields := map[string]string{}
	if r.Name != nil {
		v := strings.TrimSpace(*r.Name)
		if v == "" {
			fields["name"] = "name cannot be blank"
		}
		r.Name = &v
	}
	if r.Document != nil {
		v := strings.TrimSpace(*r.Document)
		if v == "" {
			fields["document"] = "document cannot be blank"
		}
		r.Document = &v
	}
	if r.SupplierType != nil {
		v := strings.TrimSpace(*r.SupplierType)
		if _, ok := parseType(v); !ok {
			fields["supplierType"] = "invalid supplierType"
		}
		r.SupplierType = &v
	}
	r.Address = cleanPtr(r.Address)
	r.City = cleanPtr(r.City)
	r.State = cleanPtr(r.State)
	r.PostalCode = cleanPtr(r.PostalCode)
	r.ContactName = cleanPtr(r.ContactName)
	r.Phone = cleanPtr(r.Phone)
	r.Email = cleanPtr(r.Email)
	if r.Name == nil && r.Document == nil && r.SupplierType == nil && r.Address == nil && r.City == nil && r.State == nil && r.PostalCode == nil && r.ContactName == nil && r.Phone == nil && r.Email == nil && r.Active == nil {
		fields["body"] = "at least one field must be provided"
	}
	if len(fields) > 0 {
		return Supplier{}, ValidationError{Fields: fields}
	}
	return s.store.Update(ctx, id, r)
}
func (s *Service) Delete(ctx context.Context, id int64) (Supplier, error) {
	return s.store.SoftDelete(ctx, id)
}
