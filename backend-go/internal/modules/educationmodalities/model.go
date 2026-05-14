package educationmodalities

import "time"

type EducationModality struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Active      *bool  `json:"active"`
}

type UpdateRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Active      *bool   `json:"active"`
}

type CreateInput struct {
	Name        string
	Description *string
	Active      bool
}

type UpdateInput struct {
	Name        *string
	Description *string
	Active      *bool
}

func (i UpdateInput) IsEmpty() bool {
	return i.Name == nil && i.Description == nil && i.Active == nil
}

type ListQuery struct {
	Active *bool
	Search string
	Limit  int
	Cursor *int64
}

type ListResult struct {
	Items      []EducationModality
	NextCursor *int64
}
