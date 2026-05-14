package schools

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)

type SchoolService interface {
	Create(context.Context, CreateSchoolRequest) (School, error)
	GetByID(context.Context, int64) (School, error)
	List(context.Context, ListSchoolsQuery) (ListSchoolsResult, error)
	Update(context.Context, int64, UpdateSchoolRequest) (School, error)
	Delete(context.Context, int64) (School, error)
}

type Handler struct {
	service SchoolService
}

func NewHandler(service SchoolService) Handler {
	return Handler{service: service}
}

func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	query, ok := parseListQuery(w, r)
	if !ok {
		return
	}

	result, err := h.service.List(r.Context(), query)
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
	writeJSON(w, http.StatusOK, map[string]any{
		"data": result.Schools,
		"meta": map[string]any{"limit": limit, "nextCursor": result.NextCursor, "hasMore": result.NextCursor != nil},
	})
}

func (h Handler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}

	school, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": school})
}

func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	var request CreateSchoolRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeAPIError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON")
		return
	}

	school, err := h.service.Create(r.Context(), request)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"data": school})
}

func (h Handler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}

	var request UpdateSchoolRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeAPIError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON")
		return
	}

	school, err := h.service.Update(r.Context(), id, request)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": school})
}

func (h Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}

	school, err := h.service.Delete(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": school})
}

func parseID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	value := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(value, 10, 64)
	if err != nil || id <= 0 {
		writeAPIError(w, http.StatusBadRequest, "invalid_id", "Path parameter id must be a positive integer")
		return 0, false
	}
	return id, true
}

func parseListQuery(w http.ResponseWriter, r *http.Request) (ListSchoolsQuery, bool) {
	values := r.URL.Query()
	query := ListSchoolsQuery{
		Search: strings.TrimSpace(values.Get("search")),
	}

	if value := strings.TrimSpace(values.Get("active")); value != "" {
		active, err := strconv.ParseBool(value)
		if err != nil {
			writeAPIError(w, http.StatusBadRequest, "invalid_active", "Query parameter active must be true or false")
			return ListSchoolsQuery{}, false
		}
		query.Active = &active
	}

	if value := strings.TrimSpace(values.Get("limit")); value != "" {
		limit, err := strconv.Atoi(value)
		if err != nil || limit <= 0 {
			writeAPIError(w, http.StatusBadRequest, "invalid_limit", "Query parameter limit must be a positive integer")
			return ListSchoolsQuery{}, false
		}
		query.Limit = limit
	}

	if value := strings.TrimSpace(values.Get("cursor")); value != "" {
		cursor, err := strconv.ParseInt(value, 10, 64)
		if err != nil || cursor <= 0 {
			writeAPIError(w, http.StatusBadRequest, "invalid_cursor", "Query parameter cursor must be a positive integer")
			return ListSchoolsQuery{}, false
		}
		query.Cursor = &cursor
	}

	return query, true
}

func writeError(w http.ResponseWriter, err error) {
	var validationErr ValidationError
	switch {
	case errors.As(err, &validationErr):
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": map[string]any{
				"code":    "validation_failed",
				"message": "Request validation failed",
				"fields":  validationErr.Fields,
			},
		})
	case errors.Is(err, ErrNotFound):
		writeAPIError(w, http.StatusNotFound, "school_not_found", "School not found")
	case errors.Is(err, ErrConflict):
		writeAPIError(w, http.StatusConflict, "school_code_conflict", "School code already exists")
	default:
		writeAPIError(w, http.StatusInternalServerError, "internal_error", "Internal server error")
	}
}

func writeAPIError(w http.ResponseWriter, statusCode int, code string, message string) {
	writeJSON(w, statusCode, map[string]any{
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}
