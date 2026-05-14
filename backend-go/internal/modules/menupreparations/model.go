package menupreparations

import "time"

type MenuPreparation struct {
	ID              int64     `json:"id"`
	MenuID          int64     `json:"menuId"`
	Day             int       `json:"day"`
	MealID          int64     `json:"mealId"`
	MealName        string    `json:"mealName"`
	PreparationID   int64     `json:"preparationId"`
	PreparationName string    `json:"preparationName"`
	Notes           *string   `json:"notes,omitempty"`
	Active          bool      `json:"active"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	Day           int    `json:"day"`
	MealID        int64  `json:"mealId"`
	PreparationID int64  `json:"preparationId"`
	Notes         string `json:"notes"`
	Active        *bool  `json:"active"`
}

type UpdateRequest struct {
	Day           *int    `json:"day"`
	MealID        *int64  `json:"mealId"`
	PreparationID *int64  `json:"preparationId"`
	Notes         *string `json:"notes"`
	Active        *bool   `json:"active"`
}

type ListQuery struct {
	Day    *int
	Active *bool
	Limit  int
	Cursor *int64
}
