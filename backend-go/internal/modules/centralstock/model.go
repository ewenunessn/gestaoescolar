package centralstock

import "time"

type MovementType string

const (
	MovementEntry    MovementType = "entrada"
	MovementExit     MovementType = "saida"
	MovementTransfer MovementType = "transferencia"
	MovementAdjust   MovementType = "ajuste"
)

type AdjustmentDirection string

const (
	AdjustmentIncrease AdjustmentDirection = "increase"
	AdjustmentDecrease AdjustmentDirection = "decrease"
)

type Movement struct {
	ID                  int64     `json:"id"`
	ProductID           int64     `json:"productId"`
	ProductName         string    `json:"productName"`
	ProductUnit         string    `json:"productUnit"`
	MovementType        string    `json:"movementType"`
	Quantity            string    `json:"quantity"`
	QuantityDelta       string    `json:"quantityDelta"`
	OccurredAt          string    `json:"occurredAt"`
	Description         *string   `json:"description,omitempty"`
	ReferenceDocument   *string   `json:"referenceDocument,omitempty"`
	SourceSchoolID      *int64    `json:"sourceSchoolId,omitempty"`
	SourceSchool        *string   `json:"sourceSchool,omitempty"`
	DestinationSchoolID *int64    `json:"destinationSchoolId,omitempty"`
	DestinationSchool   *string   `json:"destinationSchool,omitempty"`
	TransferGroupID     *string   `json:"transferGroupId,omitempty"`
	CreatedAt           time.Time `json:"createdAt"`
}

type Balance struct {
	ProductID   int64  `json:"productId"`
	ProductName string `json:"productName"`
	ProductUnit string `json:"productUnit"`
	Quantity    string `json:"quantity"`
}

type CreateRequest struct {
	ProductID           int64  `json:"productId"`
	MovementType        string `json:"movementType"`
	Quantity            string `json:"quantity"`
	AdjustmentDirection string `json:"adjustmentDirection"`
	OccurredAt          string `json:"occurredAt"`
	Description         string `json:"description"`
	ReferenceDocument   string `json:"referenceDocument"`
	DestinationSchoolID *int64 `json:"destinationSchoolId"`
}

type ListQuery struct {
	ProductID    *int64
	MovementType *MovementType
	Limit        int
	Cursor       *int64
}
