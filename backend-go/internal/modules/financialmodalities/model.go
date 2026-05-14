package financialmodalities

import "time"

type FinancialModality struct {
	ID               int64     `json:"id"`
	Name             string    `json:"name"`
	Code             string    `json:"code"`
	Description      *string   `json:"description,omitempty"`
	FundingSource    string    `json:"fundingSource"`
	MonthlyAmount    string    `json:"monthlyAmount"`
	PaymentCode      *string   `json:"paymentCode,omitempty"`
	PaidInstallments int       `json:"paidInstallments"`
	Active           bool      `json:"active"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	Name             string `json:"name"`
	Code             string `json:"code"`
	Description      string `json:"description"`
	FundingSource    string `json:"fundingSource"`
	MonthlyAmount    string `json:"monthlyAmount"`
	PaymentCode      string `json:"paymentCode"`
	PaidInstallments int    `json:"paidInstallments"`
	Active           *bool  `json:"active"`
}

type UpdateRequest struct {
	Name             *string `json:"name"`
	Code             *string `json:"code"`
	Description      *string `json:"description"`
	FundingSource    *string `json:"fundingSource"`
	MonthlyAmount    *string `json:"monthlyAmount"`
	PaymentCode      *string `json:"paymentCode"`
	PaidInstallments *int    `json:"paidInstallments"`
	Active           *bool   `json:"active"`
}

type ListQuery struct {
	Active *bool
	Search string
	Limit  int
	Cursor *int64
}
