package preparations

import "time"

type Preparation struct {
	ID              int64     `json:"id"`
	Name            string    `json:"name"`
	Description     *string   `json:"description,omitempty"`
	PreparationType string    `json:"preparationType"`
	Active          bool      `json:"active"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	Name            string `json:"name"`
	Description     string `json:"description"`
	PreparationType string `json:"preparationType"`
	Active          *bool  `json:"active"`
}

type UpdateRequest struct {
	Name            *string `json:"name"`
	Description     *string `json:"description"`
	PreparationType *string `json:"preparationType"`
	Active          *bool   `json:"active"`
}

type ListQuery struct {
	Active *bool
	Search string
	Limit  int
	Cursor *int64
}
