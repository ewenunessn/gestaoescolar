package schoolstock

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)

type ServiceContract interface {
	Create(context.Context, int64, CreateRequest) (Movement, error)
	GetByID(context.Context, int64, int64) (Movement, error)
	List(context.Context, int64, ListQuery) ([]Movement, *int64, error)
	Balances(context.Context, int64) ([]Balance, error)
}

type Handler struct{ service ServiceContract }

func NewHandler(s ServiceContract) Handler { return Handler{service: s} }

func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	schoolID, ok := parseID(w, r, "schoolId")
	if !ok {
		return
	}
	q, ok := parseList(w, r)
	if !ok {
		return
	}
	items, next, err := h.service.List(r.Context(), schoolID, q)
	if err != nil {
		writeErr(w, err)
		return
	}
	limit := q.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	writeJSON(w, 200, map[string]any{"data": items, "meta": map[string]any{"limit": limit, "nextCursor": next, "hasMore": next != nil}})
}

func (h Handler) Balances(w http.ResponseWriter, r *http.Request) {
	schoolID, ok := parseID(w, r, "schoolId")
	if !ok {
		return
	}
	items, err := h.service.Balances(r.Context(), schoolID)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": items})
}

func (h Handler) Get(w http.ResponseWriter, r *http.Request) {
	schoolID, ok := parseID(w, r, "schoolId")
	if !ok {
		return
	}
	id, ok := parseID(w, r, "id")
	if !ok {
		return
	}
	item, err := h.service.GetByID(r.Context(), schoolID, id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": item})
}

func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	schoolID, ok := parseID(w, r, "schoolId")
	if !ok {
		return
	}
	var req CreateRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	item, err := h.service.Create(r.Context(), schoolID, req)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 201, map[string]any{"data": item})
}

func parseID(w http.ResponseWriter, r *http.Request, param string) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, param), 10, 64)
	if err != nil || id <= 0 {
		writeAPIErr(w, 400, "invalid_id", param+" must be positive")
		return 0, false
	}
	return id, true
}

func parseList(w http.ResponseWriter, r *http.Request) (ListQuery, bool) {
	values := r.URL.Query()
	q := ListQuery{}
	if value := strings.TrimSpace(values.Get("productId")); value != "" {
		id, err := strconv.ParseInt(value, 10, 64)
		if err != nil || id <= 0 {
			writeAPIErr(w, 400, "invalid_product", "productId must be positive")
			return q, false
		}
		q.ProductID = &id
	}
	if value := strings.TrimSpace(values.Get("movementType")); value != "" {
		movementType, ok := parseMovementType(value)
		if !ok {
			writeAPIErr(w, 400, "invalid_movement_type", "invalid movementType")
			return q, false
		}
		q.MovementType = &movementType
	}
	if value := strings.TrimSpace(values.Get("limit")); value != "" {
		limit, err := strconv.Atoi(value)
		if err != nil || limit <= 0 {
			writeAPIErr(w, 400, "invalid_limit", "limit must be positive")
			return q, false
		}
		q.Limit = limit
	}
	if value := strings.TrimSpace(values.Get("cursor")); value != "" {
		cursor, err := strconv.ParseInt(value, 10, 64)
		if err != nil || cursor <= 0 {
			writeAPIErr(w, 400, "invalid_cursor", "cursor must be positive")
			return q, false
		}
		q.Cursor = &cursor
	}
	return q, true
}

func writeErr(w http.ResponseWriter, err error) {
	var ve ValidationError
	switch {
	case errors.As(err, &ve):
		writeJSON(w, 400, map[string]any{"error": map[string]any{"code": "validation_failed", "message": "Request validation failed", "fields": ve.Fields}})
	case errors.Is(err, ErrNotFound):
		writeAPIErr(w, 404, "school_stock_movement_not_found", "School stock movement not found")
	case errors.Is(err, ErrInsufficientStock):
		writeAPIErr(w, 409, "insufficient_school_stock", "School stock balance is insufficient")
	default:
		writeAPIErr(w, 500, "internal_error", "Internal server error")
	}
}

func writeAPIErr(w http.ResponseWriter, code int, c, m string) {
	writeJSON(w, code, map[string]any{"error": map[string]string{"code": c, "message": m}})
}

func writeJSON(w http.ResponseWriter, code int, p any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(p)
}
