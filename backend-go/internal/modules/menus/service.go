package menus

import (
	"context"
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound = errors.New("menu not found")
	ErrConflict = errors.New("menu already exists")
)

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	Create(context.Context, CreateInput) (Menu, error)
	GetByID(context.Context, int64) (Menu, error)
	List(context.Context, ListQuery) ([]Menu, *int64, error)
	Update(context.Context, int64, UpdateInput) (Menu, error)
	SoftDelete(context.Context, int64) (Menu, error)
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Create(ctx context.Context, r CreateRequest) (Menu, error) {
	fields := map[string]string{}
	r.Name = strings.TrimSpace(r.Name)
	r.Description = strings.TrimSpace(r.Description)
	if r.Name == "" {
		fields["name"] = "name is required"
	}
	validateYearMonth(fields, r.Year, r.Month)
	validateDateRange(fields, r.StartDate, r.EndDate)
	ids := positiveIDs(r.EducationModalityIDs)
	if len(ids) == 0 {
		fields["educationModalityIds"] = "at least one education modality is required"
	}
	if len(fields) > 0 {
		return Menu{}, ValidationError{Fields: fields}
	}
	active := true
	if r.Active != nil {
		active = *r.Active
	}
	return s.store.Create(ctx, CreateInput{Name: r.Name, Description: nullable(r.Description), Year: r.Year, Month: r.Month, StartDate: r.StartDate, EndDate: r.EndDate, EducationModalityIDs: ids, Active: active})
}

func (s *Service) GetByID(ctx context.Context, id int64) (Menu, error) {
	if id <= 0 {
		return Menu{}, ValidationError{Fields: map[string]string{"id": "id must be positive"}}
	}
	return s.store.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, q ListQuery) ([]Menu, *int64, error) {
	q.Search = strings.TrimSpace(q.Search)
	if q.Limit <= 0 {
		q.Limit = 50
	}
	if q.Limit > 100 {
		q.Limit = 100
	}
	return s.store.List(ctx, q)
}

func (s *Service) Update(ctx context.Context, id int64, r UpdateRequest) (Menu, error) {
	fields := map[string]string{}
	if id <= 0 {
		fields["id"] = "id must be positive"
	}
	input := UpdateInput{Active: r.Active, EducationModalityIDs: positiveIDs(r.EducationModalityIDs)}
	if r.Name != nil {
		v := strings.TrimSpace(*r.Name)
		if v == "" {
			fields["name"] = "name cannot be blank"
		}
		input.Name = &v
	}
	if r.Description != nil {
		v := strings.TrimSpace(*r.Description)
		input.Description = nullable(v)
	}
	if r.Year != nil {
		if *r.Year < 1 {
			fields["year"] = "year must be positive"
		}
		input.Year = r.Year
	}
	if r.Month != nil {
		if *r.Month < 1 || *r.Month > 12 {
			fields["month"] = "month must be between 1 and 12"
		}
		input.Month = r.Month
	}
	if r.StartDate != nil {
		v := strings.TrimSpace(*r.StartDate)
		if _, err := parseDate(v); err != nil {
			fields["startDate"] = "startDate must use YYYY-MM-DD"
		}
		input.StartDate = &v
	}
	if r.EndDate != nil {
		v := strings.TrimSpace(*r.EndDate)
		if _, err := parseDate(v); err != nil {
			fields["endDate"] = "endDate must use YYYY-MM-DD"
		}
		input.EndDate = &v
	}
	if r.ReplaceModalities != nil {
		input.ReplaceModalities = *r.ReplaceModalities
	}
	if input.ReplaceModalities && len(input.EducationModalityIDs) == 0 {
		fields["educationModalityIds"] = "at least one education modality is required when replacing modalities"
	}
	if input.Name == nil && input.Description == nil && input.Year == nil && input.Month == nil && input.StartDate == nil && input.EndDate == nil && !input.ReplaceModalities && input.Active == nil {
		fields["body"] = "at least one field must be provided"
	}
	if len(fields) > 0 {
		return Menu{}, ValidationError{Fields: fields}
	}
	return s.store.Update(ctx, id, input)
}

func (s *Service) Delete(ctx context.Context, id int64) (Menu, error) {
	if id <= 0 {
		return Menu{}, ValidationError{Fields: map[string]string{"id": "id must be positive"}}
	}
	return s.store.SoftDelete(ctx, id)
}

func validateYearMonth(fields map[string]string, year int, month int) {
	if year < 1 {
		fields["year"] = "year must be positive"
	}
	if month < 1 || month > 12 {
		fields["month"] = "month must be between 1 and 12"
	}
}

func validateDateRange(fields map[string]string, start string, end string) {
	startDate, err := parseDate(start)
	if err != nil {
		fields["startDate"] = "startDate must use YYYY-MM-DD"
	}
	endDate, err := parseDate(end)
	if err != nil {
		fields["endDate"] = "endDate must use YYYY-MM-DD"
	}
	if !startDate.IsZero() && !endDate.IsZero() && endDate.Before(startDate) {
		fields["endDate"] = "endDate must be greater than or equal to startDate"
	}
}

func parseDate(value string) (time.Time, error) {
	return time.Parse("2006-01-02", strings.TrimSpace(value))
}

func positiveIDs(ids []int64) []int64 {
	out := []int64{}
	seen := map[int64]bool{}
	for _, id := range ids {
		if id > 0 && !seen[id] {
			out = append(out, id)
			seen[id] = true
		}
	}
	return out
}

func nullable(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}
