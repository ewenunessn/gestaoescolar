package schools

import (
	"errors"
	"strings"
)

var (
	ErrNotFound = errors.New("school not found")
	ErrConflict = errors.New("school already exists")
)

type ValidationError struct {
	Fields map[string]string
}

func (e ValidationError) Error() string {
	if len(e.Fields) == 0 {
		return "validation failed"
	}

	fields := make([]string, 0, len(e.Fields))
	for field := range e.Fields {
		fields = append(fields, field)
	}
	return "validation failed: " + strings.Join(fields, ", ")
}

func newValidationError(fields map[string]string) error {
	if len(fields) == 0 {
		return nil
	}
	return ValidationError{Fields: fields}
}
