package preparationproducts

import "time"

type PerCapitaUnit string

const (
	PerCapitaUnitGram       PerCapitaUnit = "g"
	PerCapitaUnitMilliliter PerCapitaUnit = "ml"
)

type PreparationProduct struct {
	ID                    int64         `json:"id"`
	PreparationID         int64         `json:"preparationId"`
	ProductID             int64         `json:"productId"`
	ProductName           string        `json:"productName,omitempty"`
	EducationModalityID   *int64        `json:"educationModalityId,omitempty"`
	EducationModalityName *string       `json:"educationModalityName,omitempty"`
	PerCapitaAmount       string        `json:"perCapitaAmount"`
	PerCapitaUnit         PerCapitaUnit `json:"perCapitaUnit"`
	Active                bool          `json:"active"`
	CreatedAt             time.Time     `json:"createdAt"`
	UpdatedAt             time.Time     `json:"updatedAt"`
}

type CreateRequest struct {
	ProductID           int64  `json:"productId"`
	EducationModalityID *int64 `json:"educationModalityId"`
	PerCapitaAmount     string `json:"perCapitaAmount"`
	PerCapitaUnit       string `json:"perCapitaUnit"`
	Active              *bool  `json:"active"`
}

type UpdateRequest struct {
	ProductID           *int64  `json:"productId"`
	EducationModalityID *int64  `json:"educationModalityId"`
	PerCapitaAmount     *string `json:"perCapitaAmount"`
	PerCapitaUnit       *string `json:"perCapitaUnit"`
	Active              *bool   `json:"active"`
}

type CreateInput struct {
	PreparationID       int64
	ProductID           int64
	EducationModalityID *int64
	PerCapitaAmount     string
	PerCapitaUnit       PerCapitaUnit
	Active              bool
}

type UpdateInput struct {
	ProductID           *int64
	EducationModalityID *int64
	PerCapitaAmount     *string
	PerCapitaUnit       *PerCapitaUnit
	Active              *bool
}

func (i UpdateInput) IsEmpty() bool {
	return i.ProductID == nil && i.EducationModalityID == nil && i.PerCapitaAmount == nil && i.PerCapitaUnit == nil && i.Active == nil
}

type ListQuery struct {
	Limit  int
	Cursor *int64
}

type ListResult struct {
	Items      []PreparationProduct
	NextCursor *int64
}
