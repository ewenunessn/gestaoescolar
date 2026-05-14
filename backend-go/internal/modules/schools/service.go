package schools

import (
	"context"
	"strings"
)

const (
	defaultListLimit = 50
	maxListLimit     = 100
)

type Store interface {
	Create(context.Context, CreateSchoolInput) (School, error)
	GetByID(context.Context, int64) (School, error)
	List(context.Context, ListSchoolsQuery) (ListSchoolsResult, error)
	Update(context.Context, int64, UpdateSchoolInput) (School, error)
	SoftDelete(context.Context, int64) (School, error)
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, request CreateSchoolRequest) (School, error) {
	fields := map[string]string{}

	name := strings.TrimSpace(request.Name)
	code := strings.TrimSpace(request.Code)
	city := strings.TrimSpace(request.City)

	if name == "" {
		fields["name"] = "name is required"
	}
	if code == "" {
		fields["code"] = "code is required"
	}
	if city == "" {
		fields["city"] = "city is required"
	}

	administrationType, ok := parseAdministrationType(request.AdministrationType)
	if !ok {
		fields["administrationType"] = "administrationType must be municipal, state, federal, or private"
	}

	if err := newValidationError(fields); err != nil {
		return School{}, err
	}

	active := true
	if request.Active != nil {
		active = *request.Active
	}

	return s.store.Create(ctx, CreateSchoolInput{
		Name:               name,
		Code:               code,
		Address:            optionalString(request.Address),
		City:               city,
		MapsAddress:        optionalString(request.MapsAddress),
		Phone:              optionalString(request.Phone),
		Email:              optionalString(request.Email),
		ManagerName:        optionalString(request.ManagerName),
		AdministrationType: administrationType,
		Active:             active,
	})
}

func (s *Service) GetByID(ctx context.Context, id int64) (School, error) {
	return s.store.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, query ListSchoolsQuery) (ListSchoolsResult, error) {
	query.Search = strings.TrimSpace(query.Search)
	if query.Limit <= 0 {
		query.Limit = defaultListLimit
	}
	if query.Limit > maxListLimit {
		query.Limit = maxListLimit
	}
	return s.store.List(ctx, query)
}

func (s *Service) Update(ctx context.Context, id int64, request UpdateSchoolRequest) (School, error) {
	fields := map[string]string{}
	input := UpdateSchoolInput{
		Active: request.Active,
	}

	if request.Name != nil {
		input.Name = trimRequired("name", *request.Name, fields)
	}
	if request.Code != nil {
		input.Code = trimRequired("code", *request.Code, fields)
	}
	if request.City != nil {
		input.City = trimRequired("city", *request.City, fields)
	}
	if request.Address != nil {
		input.Address = optionalString(*request.Address)
	}
	if request.MapsAddress != nil {
		input.MapsAddress = optionalString(*request.MapsAddress)
	}
	if request.Phone != nil {
		input.Phone = optionalString(*request.Phone)
	}
	if request.Email != nil {
		input.Email = optionalString(*request.Email)
	}
	if request.ManagerName != nil {
		input.ManagerName = optionalString(*request.ManagerName)
	}
	if request.AdministrationType != nil {
		administrationType, ok := parseAdministrationType(*request.AdministrationType)
		if !ok {
			fields["administrationType"] = "administrationType must be municipal, state, federal, or private"
		}
		input.AdministrationType = administrationType
	}

	if input.IsEmpty() {
		fields["body"] = "at least one field must be provided"
	}
	if err := newValidationError(fields); err != nil {
		return School{}, err
	}

	return s.store.Update(ctx, id, input)
}

func (s *Service) Delete(ctx context.Context, id int64) (School, error) {
	return s.store.SoftDelete(ctx, id)
}

func optionalString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func trimRequired(field string, value string, fields map[string]string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		fields[field] = field + " cannot be blank"
		return nil
	}
	return &value
}

func parseAdministrationType(value string) (*AdministrationType, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, true
	}

	administrationType := AdministrationType(value)
	switch administrationType {
	case AdministrationTypeMunicipal, AdministrationTypeState, AdministrationTypeFederal, AdministrationTypePrivate:
		return &administrationType, true
	default:
		return nil, false
	}
}
