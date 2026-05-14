package schools

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type fakeSchoolService struct {
	createValue School
	createErr   error
}

func (f fakeSchoolService) Create(context.Context, CreateSchoolRequest) (School, error) {
	return f.createValue, f.createErr
}

func (f fakeSchoolService) GetByID(context.Context, int64) (School, error) {
	return School{}, ErrNotFound
}

func (f fakeSchoolService) List(context.Context, ListSchoolsQuery) (ListSchoolsResult, error) {
	return ListSchoolsResult{}, nil
}

func (f fakeSchoolService) Update(context.Context, int64, UpdateSchoolRequest) (School, error) {
	return School{}, ErrNotFound
}

func (f fakeSchoolService) Delete(context.Context, int64) (School, error) {
	return School{}, ErrNotFound
}

func TestCreateSchoolReturnsCreated(t *testing.T) {
	handler := NewHandler(fakeSchoolService{
		createValue: School{
			ID:        10,
			Name:      "Municipal School",
			Code:      "INEP-001",
			City:      "Macapa",
			Active:    true,
			CreatedAt: time.Date(2026, 5, 12, 10, 0, 0, 0, time.UTC),
			UpdatedAt: time.Date(2026, 5, 12, 10, 0, 0, 0, time.UTC),
		},
	})

	body := bytes.NewBufferString(`{"name":"Municipal School","code":"INEP-001","city":"Macapa"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/schools", body)
	res := httptest.NewRecorder()

	handler.Create(res, req)

	if res.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusCreated)
	}

	var payload struct {
		Data School `json:"data"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Data.ID != 10 {
		t.Fatalf("id = %d, want 10", payload.Data.ID)
	}
}

func TestCreateSchoolRejectsMalformedJSON(t *testing.T) {
	handler := NewHandler(fakeSchoolService{})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/schools", bytes.NewBufferString(`{"name":`))
	res := httptest.NewRecorder()

	handler.Create(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusBadRequest)
	}
}
