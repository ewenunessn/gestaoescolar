package contractproducts

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

type ServiceContract interface {
	Create(context.Context, int64, CreateRequest) (ContractProduct, error)
	ListByContract(context.Context, int64, ListQuery) (ListResult, error)
	GetByID(context.Context, int64, int64) (ContractProduct, error)
	Update(context.Context, int64, int64, UpdateRequest) (ContractProduct, error)
	Delete(context.Context, int64, int64) (ContractProduct, error)
}

type Handler struct {
	service ServiceContract
}

func NewHandler(service ServiceContract) Handler {
	return Handler{service: service}
}

func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	contractID, ok := parseParamID(w, r, "contractId")
	if !ok {
		return
	}
	query, ok := parseListQuery(w, r)
	if !ok {
		return
	}
	result, err := h.service.ListByContract(r.Context(), contractID, query)
	if err != nil {
		writeError(w, err)
		return
	}
	limit := query.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": result.Items, "meta": map[string]any{"limit": limit, "nextCursor": result.NextCursor, "hasMore": result.NextCursor != nil}})
}

func (h Handler) Get(w http.ResponseWriter, r *http.Request) {
	contractID, ok := parseParamID(w, r, "contractId")
	if !ok {
		return
	}
	id, ok := parseParamID(w, r, "id")
	if !ok {
		return
	}
	item, err := h.service.GetByID(r.Context(), contractID, id)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": item})
}

func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	contractID, ok := parseParamID(w, r, "contractId")
	if !ok {
		return
	}
	var request CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeAPIError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON")
		return
	}
	item, err := h.service.Create(r.Context(), contractID, request)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": item})
}

func (h Handler) Update(w http.ResponseWriter, r *http.Request) {
	contractID, ok := parseParamID(w, r, "contractId")
	if !ok {
		return
	}
	id, ok := parseParamID(w, r, "id")
	if !ok {
		return
	}
	var request UpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeAPIError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON")
		return
	}
	item, err := h.service.Update(r.Context(), contractID, id, request)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": item})
}

func (h Handler) Delete(w http.ResponseWriter, r *http.Request) {
	contractID, ok := parseParamID(w, r, "contractId")
	if !ok {
		return
	}
	id, ok := parseParamID(w, r, "id")
	if !ok {
		return
	}
	item, err := h.service.Delete(r.Context(), contractID, id)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": item})
}

func parseParamID(w http.ResponseWriter, r *http.Request, param string) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, param), 10, 64)
	if err != nil || id <= 0 {
		writeAPIError(w, http.StatusBadRequest, "invalid_id", param+" must be a positive integer")
		return 0, false
	}
	return id, true
}

func parseListQuery(w http.ResponseWriter, r *http.Request) (ListQuery, bool) {
	values := r.URL.Query()
	query := ListQuery{}
	if value := values.Get("limit"); value != "" {
		limit, err := strconv.Atoi(value)
		if err != nil || limit <= 0 {
			writeAPIError(w, http.StatusBadRequest, "invalid_limit", "Query parameter limit must be a positive integer")
			return ListQuery{}, false
		}
		query.Limit = limit
	}
	if value := values.Get("cursor"); value != "" {
		cursor, err := strconv.ParseInt(value, 10, 64)
		if err != nil || cursor <= 0 {
			writeAPIError(w, http.StatusBadRequest, "invalid_cursor", "Query parameter cursor must be a positive integer")
			return ListQuery{}, false
		}
		query.Cursor = &cursor
	}
	return query, true
}

func writeError(w http.ResponseWriter, err error) {
	var validationErr ValidationError
	switch {
	case errors.As(err, &validationErr):
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": map[string]any{"code": "validation_failed", "message": "Request validation failed", "fields": validationErr.Fields}})
	case errors.Is(err, ErrNotFound):
		writeAPIError(w, http.StatusNotFound, "contract_product_not_found", "Contract product not found")
	case errors.Is(err, ErrConflict):
		writeAPIError(w, http.StatusConflict, "contract_product_conflict", "Contract already has this active product")
	default:
		writeAPIError(w, http.StatusInternalServerError, "internal_error", "Internal server error")
	}
}

func writeAPIError(w http.ResponseWriter, statusCode int, code string, message string) {
	writeJSON(w, statusCode, map[string]any{"error": map[string]string{"code": code, "message": message}})
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}
