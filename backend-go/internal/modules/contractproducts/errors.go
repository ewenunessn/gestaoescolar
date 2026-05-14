package contractproducts

import "errors"

var (
	ErrNotFound = errors.New("contract product not found")
	ErrConflict = errors.New("contract already has this active product")
)

type ValidationError struct {
	Fields map[string]string
}

func (e ValidationError) Error() string {
	return "validation failed"
}

func newValidationError(fields map[string]string) error {
	if len(fields) == 0 {
		return nil
	}
	return ValidationError{Fields: fields}
}
