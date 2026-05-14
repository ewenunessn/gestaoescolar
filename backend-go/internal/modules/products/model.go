package products

import "time"

type Product struct {
	ID               int64     `json:"id"`
	Name             string    `json:"name"`
	Description      *string   `json:"description,omitempty"`
	Unit             string    `json:"unit"`
	Category         string    `json:"category"`
	CorrectionFactor float64   `json:"fator_correcao"`
	Active           bool      `json:"active"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	Name             string   `json:"name"`
	Description      string   `json:"description"`
	Unit             string   `json:"unit"`
	Category         string   `json:"category"`
	CorrectionFactor *float64 `json:"fator_correcao"`
	Active           *bool    `json:"active"`
}

type UpdateRequest struct {
	Name             *string  `json:"name"`
	Description      *string  `json:"description"`
	Unit             *string  `json:"unit"`
	Category         *string  `json:"category"`
	CorrectionFactor *float64 `json:"fator_correcao"`
	Active           *bool    `json:"active"`
}

type ListQuery struct {
	Active *bool
	Search string
	Limit  int
	Cursor *int64
}
