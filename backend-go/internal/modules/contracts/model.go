package contracts

import "time"

type ContractStatus string

const (
	StatusActive    ContractStatus = "active"
	StatusInactive  ContractStatus = "inactive"
	StatusSuspended ContractStatus = "suspended"
	StatusFinished  ContractStatus = "finished"
)

type ContractType string

const (
	TypeSupply  ContractType = "supply"
	TypeService ContractType = "service"
	TypeMixed   ContractType = "mixed"
)

type Contract struct {
	ID           int64          `json:"id"`
	Number       string         `json:"number"`
	SupplierID   int64          `json:"supplierId"`
	SupplierName string         `json:"supplierName,omitempty"`
	StartDate    string         `json:"startDate"`
	EndDate      string         `json:"endDate"`
	TotalAmount  string         `json:"totalAmount"`
	Status       ContractStatus `json:"status"`
	ContractType ContractType   `json:"contractType"`
	Notes        *string        `json:"notes,omitempty"`
	Active       bool           `json:"active"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
}
type CreateRequest struct {
	Number       string `json:"number"`
	SupplierID   int64  `json:"supplierId"`
	StartDate    string `json:"startDate"`
	EndDate      string `json:"endDate"`
	Status       string `json:"status"`
	ContractType string `json:"contractType"`
	Notes        string `json:"notes"`
	Active       *bool  `json:"active"`
}
type UpdateRequest struct {
	Number       *string `json:"number"`
	SupplierID   *int64  `json:"supplierId"`
	StartDate    *string `json:"startDate"`
	EndDate      *string `json:"endDate"`
	Status       *string `json:"status"`
	ContractType *string `json:"contractType"`
	Notes        *string `json:"notes"`
	Active       *bool   `json:"active"`
}
type ListQuery struct {
	Active     *bool
	Status     *ContractStatus
	SupplierID *int64
	Search     string
	Limit      int
	Cursor     *int64
}
