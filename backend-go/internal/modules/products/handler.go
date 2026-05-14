package products

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/go-chi/chi/v5"
	"net/http"
	"strconv"
	"strings"
)

type ServiceContract interface {
	Create(context.Context, CreateRequest) (Product, error)
	GetByID(context.Context, int64) (Product, error)
	List(context.Context, ListQuery) ([]Product, *int64, error)
	Update(context.Context, int64, UpdateRequest) (Product, error)
	Delete(context.Context, int64) (Product, error)
}
type Handler struct{ service ServiceContract }

func NewHandler(s ServiceContract) Handler { return Handler{service: s} }
func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	q, ok := parseList(w, r)
	if !ok {
		return
	}
	items, next, err := h.service.List(r.Context(), q)
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
func (h Handler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	item, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": item})
}
func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	item, err := h.service.Create(r.Context(), req)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 201, map[string]any{"data": item})
}
func (h Handler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	var req UpdateRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	item, err := h.service.Update(r.Context(), id, req)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": item})
}
func (h Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	item, err := h.service.Delete(r.Context(), id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": item})
}
func parseID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		writeAPIErr(w, 400, "invalid_id", "Path parameter id must be a positive integer")
		return 0, false
	}
	return id, true
}
func parseList(w http.ResponseWriter, r *http.Request) (ListQuery, bool) {
	v := r.URL.Query()
	q := ListQuery{Search: strings.TrimSpace(v.Get("search"))}
	if s := strings.TrimSpace(v.Get("active")); s != "" {
		b, err := strconv.ParseBool(s)
		if err != nil {
			writeAPIErr(w, 400, "invalid_active", "Query parameter active must be true or false")
			return q, false
		}
		q.Active = &b
	}
	if s := strings.TrimSpace(v.Get("limit")); s != "" {
		n, err := strconv.Atoi(s)
		if err != nil || n <= 0 {
			writeAPIErr(w, 400, "invalid_limit", "Query parameter limit must be positive")
			return q, false
		}
		q.Limit = n
	}
	if s := strings.TrimSpace(v.Get("cursor")); s != "" {
		n, err := strconv.ParseInt(s, 10, 64)
		if err != nil || n <= 0 {
			writeAPIErr(w, 400, "invalid_cursor", "Query parameter cursor must be positive")
			return q, false
		}
		q.Cursor = &n
	}
	return q, true
}
func writeErr(w http.ResponseWriter, err error) {
	var ve ValidationError
	switch {
	case errors.As(err, &ve):
		writeJSON(w, 400, map[string]any{"error": map[string]any{"code": "validation_failed", "message": "Request validation failed", "fields": ve.Fields}})
	case errors.Is(err, ErrNotFound):
		writeAPIErr(w, 404, "product_not_found", "Product not found")
	case errors.Is(err, ErrConflict):
		writeAPIErr(w, 409, "product_conflict", "Product already exists")
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
