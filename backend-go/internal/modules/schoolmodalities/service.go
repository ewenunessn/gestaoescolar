package schoolmodalities

import "context"

type Store interface {
	Create(context.Context, CreateInput) (SchoolEducationModality, error)
	ListBySchool(context.Context, int64, ListQuery) (ListResult, error)
	Update(context.Context, int64, int64, UpdateInput) (SchoolEducationModality, error)
	SoftDelete(context.Context, int64, int64) (SchoolEducationModality, error)
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, schoolID int64, request CreateRequest) (SchoolEducationModality, error) {
	fields := map[string]string{}
	if schoolID <= 0 {
		fields["schoolId"] = "schoolId must be a positive integer"
	}
	if request.EducationModalityID <= 0 {
		fields["educationModalityId"] = "educationModalityId must be a positive integer"
	}
	if request.StudentCount < 0 {
		fields["studentCount"] = "studentCount cannot be negative"
	}
	if err := newValidationError(fields); err != nil {
		return SchoolEducationModality{}, err
	}
	active := true
	if request.Active != nil {
		active = *request.Active
	}
	return s.store.Create(ctx, CreateInput{
		SchoolID:            schoolID,
		EducationModalityID: request.EducationModalityID,
		StudentCount:        request.StudentCount,
		Active:              active,
	})
}

func (s *Service) ListBySchool(ctx context.Context, schoolID int64, query ListQuery) (ListResult, error) {
	if schoolID <= 0 {
		return ListResult{}, ValidationError{Fields: map[string]string{"schoolId": "schoolId must be a positive integer"}}
	}
	if query.Limit <= 0 {
		query.Limit = 50
	}
	if query.Limit > 100 {
		query.Limit = 100
	}
	return s.store.ListBySchool(ctx, schoolID, query)
}

func (s *Service) Update(ctx context.Context, schoolID int64, id int64, request UpdateRequest) (SchoolEducationModality, error) {
	fields := map[string]string{}
	if schoolID <= 0 {
		fields["schoolId"] = "schoolId must be a positive integer"
	}
	if id <= 0 {
		fields["id"] = "id must be a positive integer"
	}
	if request.EducationModalityID != nil && *request.EducationModalityID <= 0 {
		fields["educationModalityId"] = "educationModalityId must be a positive integer"
	}
	if request.StudentCount != nil && *request.StudentCount < 0 {
		fields["studentCount"] = "studentCount cannot be negative"
	}
	input := UpdateInput{
		EducationModalityID: request.EducationModalityID,
		StudentCount:        request.StudentCount,
		Active:              request.Active,
	}
	if input.IsEmpty() {
		fields["body"] = "at least one field must be provided"
	}
	if err := newValidationError(fields); err != nil {
		return SchoolEducationModality{}, err
	}
	return s.store.Update(ctx, schoolID, id, input)
}

func (s *Service) Delete(ctx context.Context, schoolID int64, id int64) (SchoolEducationModality, error) {
	if schoolID <= 0 || id <= 0 {
		return SchoolEducationModality{}, ValidationError{Fields: map[string]string{"id": "schoolId and id must be positive integers"}}
	}
	return s.store.SoftDelete(ctx, schoolID, id)
}
