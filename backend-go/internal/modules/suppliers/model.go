package suppliers

import "time"

type SupplierType string

const (
	SupplierTypeFamilyFarming SupplierType = "family_farming"
	SupplierTypeCooperative   SupplierType = "cooperative"
	SupplierTypeConventional  SupplierType = "conventional"
	SupplierTypeIndividual    SupplierType = "individual"
	SupplierTypeOther         SupplierType = "other"
)

type Supplier struct {
	ID           int64        `json:"id"`
	Name         string       `json:"name"`
	Document     string       `json:"document"`
	SupplierType SupplierType `json:"supplierType"`
	Address      *string      `json:"address,omitempty"`
	City         *string      `json:"city,omitempty"`
	State        *string      `json:"state,omitempty"`
	PostalCode   *string      `json:"postalCode,omitempty"`
	ContactName  *string      `json:"contactName,omitempty"`
	Phone        *string      `json:"phone,omitempty"`
	Email        *string      `json:"email,omitempty"`
	Active       bool         `json:"active"`
	CreatedAt    time.Time    `json:"createdAt"`
	UpdatedAt    time.Time    `json:"updatedAt"`
}
type CreateRequest struct {
	Name         string `json:"name"`
	Document     string `json:"document"`
	SupplierType string `json:"supplierType"`
	Address      string `json:"address"`
	City         string `json:"city"`
	State        string `json:"state"`
	PostalCode   string `json:"postalCode"`
	ContactName  string `json:"contactName"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	Active       *bool  `json:"active"`
}
type UpdateRequest struct {
	Name         *string `json:"name"`
	Document     *string `json:"document"`
	SupplierType *string `json:"supplierType"`
	Address      *string `json:"address"`
	City         *string `json:"city"`
	State        *string `json:"state"`
	PostalCode   *string `json:"postalCode"`
	ContactName  *string `json:"contactName"`
	Phone        *string `json:"phone"`
	Email        *string `json:"email"`
	Active       *bool   `json:"active"`
}
type ListQuery struct {
	Active       *bool
	Search       string
	SupplierType *SupplierType
	Limit        int
	Cursor       *int64
}
