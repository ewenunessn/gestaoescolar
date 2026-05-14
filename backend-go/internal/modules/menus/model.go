package menus

import "time"

type Menu struct {
	ID                   int64     `json:"id"`
	Name                 string    `json:"name"`
	Description          *string   `json:"description,omitempty"`
	Year                 int       `json:"year"`
	Month                int       `json:"month"`
	StartDate            string    `json:"startDate"`
	EndDate              string    `json:"endDate"`
	EducationModalityIDs []int64   `json:"educationModalityIds"`
	Active               bool      `json:"active"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	Name                 string  `json:"name"`
	Description          string  `json:"description"`
	Year                 int     `json:"year"`
	Month                int     `json:"month"`
	StartDate            string  `json:"startDate"`
	EndDate              string  `json:"endDate"`
	EducationModalityIDs []int64 `json:"educationModalityIds"`
	Active               *bool   `json:"active"`
}

type UpdateRequest struct {
	Name                 *string `json:"name"`
	Description          *string `json:"description"`
	Year                 *int    `json:"year"`
	Month                *int    `json:"month"`
	StartDate            *string `json:"startDate"`
	EndDate              *string `json:"endDate"`
	EducationModalityIDs []int64 `json:"educationModalityIds"`
	ReplaceModalities    *bool   `json:"replaceModalities"`
	Active               *bool   `json:"active"`
}

type ListQuery struct {
	Active *bool
	Year   *int
	Month  *int
	Search string
	Limit  int
	Cursor *int64
}

type CreateInput struct {
	Name                 string
	Description          *string
	Year                 int
	Month                int
	StartDate            string
	EndDate              string
	EducationModalityIDs []int64
	Active               bool
}

type UpdateInput struct {
	Name                 *string
	Description          *string
	Year                 *int
	Month                *int
	StartDate            *string
	EndDate              *string
	EducationModalityIDs []int64
	ReplaceModalities    bool
	Active               *bool
}
