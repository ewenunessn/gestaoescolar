package meals

import "time"

type Meal struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Code      string    `json:"code"`
	SortOrder int       `json:"sortOrder"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	Name      string `json:"name"`
	Code      string `json:"code"`
	SortOrder int    `json:"sortOrder"`
	Active    *bool  `json:"active"`
}

type UpdateRequest struct {
	Name      *string `json:"name"`
	Code      *string `json:"code"`
	SortOrder *int    `json:"sortOrder"`
	Active    *bool   `json:"active"`
}

type ListQuery struct {
	Active *bool
	Search string
	Limit  int
	Cursor *int64
}
