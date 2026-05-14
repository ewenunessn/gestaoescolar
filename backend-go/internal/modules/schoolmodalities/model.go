package schoolmodalities

import "time"

type SchoolEducationModality struct {
	ID                    int64     `json:"id"`
	SchoolID              int64     `json:"schoolId"`
	EducationModalityID   int64     `json:"educationModalityId"`
	EducationModalityName string    `json:"educationModalityName"`
	StudentCount          int       `json:"studentCount"`
	Active                bool      `json:"active"`
	CreatedAt             time.Time `json:"createdAt"`
	UpdatedAt             time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	EducationModalityID int64 `json:"educationModalityId"`
	StudentCount        int   `json:"studentCount"`
	Active              *bool `json:"active"`
}

type UpdateRequest struct {
	EducationModalityID *int64 `json:"educationModalityId"`
	StudentCount        *int   `json:"studentCount"`
	Active              *bool  `json:"active"`
}

type CreateInput struct {
	SchoolID            int64
	EducationModalityID int64
	StudentCount        int
	Active              bool
}

type UpdateInput struct {
	EducationModalityID *int64
	StudentCount        *int
	Active              *bool
}

func (i UpdateInput) IsEmpty() bool {
	return i.EducationModalityID == nil && i.StudentCount == nil && i.Active == nil
}

type ListResult struct {
	Items      []SchoolEducationModality
	NextCursor *int64
}

type ListQuery struct {
	Limit  int
	Cursor *int64
}
