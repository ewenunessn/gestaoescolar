package contractbalanceentries

import "time"

type ControlType string

const (
	ControlTypeItem                  ControlType = "item"
	ControlTypeItemFinancialModality ControlType = "item_financial_modality"
)

type EntryType string

const (
	EntryTypeInitialBalance EntryType = "initial_balance"
	EntryTypeConsumption    EntryType = "consumption"
	EntryTypeReversal       EntryType = "reversal"
	EntryTypeAddendum       EntryType = "addendum"
)

type ContractBalanceEntry struct {
	ID                    int64       `json:"id"`
	ContractID            int64       `json:"contractId"`
	ContractProductID     int64       `json:"contractProductId"`
	ProductName           string      `json:"productName,omitempty"`
	FinancialModalityID   *int64      `json:"financialModalityId,omitempty"`
	FinancialModalityName *string     `json:"financialModalityName,omitempty"`
	ControlType           ControlType `json:"controlType"`
	EntryType             EntryType   `json:"entryType"`
	Quantity              *string     `json:"quantity,omitempty"`
	Amount                string      `json:"amount"`
	OccurredAt            string      `json:"occurredAt"`
	Description           *string     `json:"description,omitempty"`
	ReferenceDocument     *string     `json:"referenceDocument,omitempty"`
	CreatedAt             time.Time   `json:"createdAt"`
}

type BalanceSummaryItem struct {
	ContractProductID     int64   `json:"contractProductId"`
	ProductName           string  `json:"productName"`
	FinancialModalityID   *int64  `json:"financialModalityId,omitempty"`
	FinancialModalityName *string `json:"financialModalityName,omitempty"`
	AllocatedAmount       string  `json:"allocatedAmount"`
	ConsumedAmount        string  `json:"consumedAmount"`
	ReversedAmount        string  `json:"reversedAmount"`
	AddendumAmount        string  `json:"addendumAmount"`
	BalanceAmount         string  `json:"balanceAmount"`
}

type CreateRequest struct {
	ContractProductID   int64  `json:"contractProductId"`
	FinancialModalityID *int64 `json:"financialModalityId"`
	ControlType         string `json:"controlType"`
	EntryType           string `json:"entryType"`
	Quantity            string `json:"quantity"`
	Amount              string `json:"amount"`
	OccurredAt          string `json:"occurredAt"`
	Description         string `json:"description"`
	ReferenceDocument   string `json:"referenceDocument"`
}

type ListQuery struct {
	ContractProductID   *int64
	FinancialModalityID *int64
	EntryType           *EntryType
	Limit               int
	Cursor              *int64
}
