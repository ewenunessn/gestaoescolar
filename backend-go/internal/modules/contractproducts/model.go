package contractproducts

import "time"

type ContractProduct struct {
	ID          int64     `json:"id"`
	ContractID  int64     `json:"contractId"`
	ProductID   int64     `json:"productId"`
	ProductName string    `json:"productName,omitempty"`
	Quantity    string    `json:"quantity"`
	UnitPrice   string    `json:"unitPrice"`
	TotalAmount string    `json:"totalAmount"`
	Notes       *string   `json:"notes,omitempty"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	ProductID int64  `json:"productId"`
	Quantity  string `json:"quantity"`
	UnitPrice string `json:"unitPrice"`
	Notes     string `json:"notes"`
	Active    *bool  `json:"active"`
}

type UpdateRequest struct {
	ProductID *int64  `json:"productId"`
	Quantity  *string `json:"quantity"`
	UnitPrice *string `json:"unitPrice"`
	Notes     *string `json:"notes"`
	Active    *bool   `json:"active"`
}

type CreateInput struct {
	ContractID  int64
	ProductID   int64
	Quantity    string
	UnitPrice   string
	TotalAmount string
	Notes       string
	Active      bool
}

type UpdateInput struct {
	ProductID   *int64
	Quantity    *string
	UnitPrice   *string
	TotalAmount *string
	Notes       *string
	Active      *bool
}

func (i UpdateInput) IsEmpty() bool {
	return i.ProductID == nil && i.Quantity == nil && i.UnitPrice == nil && i.TotalAmount == nil && i.Notes == nil && i.Active == nil
}

type ListQuery struct {
	Limit  int
	Cursor *int64
}

type ListResult struct {
	Items      []ContractProduct
	NextCursor *int64
}
