package menupreparations

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

type ServiceContract interface {
	Create(context.Context, int64, CreateRequest) (MenuPreparation, error)
	ListByMenu(context.Context, int64, ListQuery) ([]MenuPreparation, *int64, error)
	GetByID(context.Context, int64, int64) (MenuPreparation, error)
	Update(context.Context, int64, int64, UpdateRequest) (MenuPreparation, error)
	Delete(context.Context, int64, int64) (MenuPreparation, error)
}

type Handler struct{ service ServiceContract }

func NewHandler(s ServiceContract) Handler { return Handler{service: s} }

func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	menuID, ok := parseParamID(w, r, "menuId")
	if !ok {
		return
	}
	q, ok := parseList(w, r)
	if !ok {
		return
	}
	items, next, err := h.service.ListByMenu(r.Context(), menuID, q)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": items, "meta": map[string]any{"limit": q.Limit, "nextCursor": next, "hasMore": next != nil}})
}

func (h Handler) Get(w http.ResponseWriter, r *http.Request) {
	menuID, ok := parseParamID(w, r, "menuId")
	if !ok {
		return
	}
	id, ok := parseParamID(w, r, "id")
	if !ok {
		return
	}
	item, err := h.service.GetByID(r.Context(), menuID, id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": item})
}

func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	menuID, ok := parseParamID(w, r, "menuId")
	if !ok {
		return
	}
	var req CreateRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	item, err := h.service.Create(r.Context(), menuID, req)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 201, map[string]any{"data": item})
}

func (h Handler) Update(w http.ResponseWriter, r *http.Request) {
	menuID, ok := parseParamID(w, r, "menuId")
	if !ok {
		return
	}
	id, ok := parseParamID(w, r, "id")
	if !ok {
		return
	}
	var req UpdateRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	item, err := h.service.Update(r.Context(), menuID, id, req)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": item})
}

func (h Handler) Delete(w http.ResponseWriter, r *http.Request) {
	menuID, ok := parseParamID(w, r, "menuId")
	if !ok {
		return
	}
	id, ok := parseParamID(w, r, "id")
	if !ok {
		return
	}
	item, err := h.service.Delete(r.Context(), menuID, id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": item})
}

func parseParamID(w http.ResponseWriter, r *http.Request, name string) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, name), 10, 64)
	if err != nil || id <= 0 {
		writeAPIErr(w, 400, "invalid_id", name+" must be positive")
		return 0, false
	}
	return id, true
}

func parseList(w http.ResponseWriter, r *http.Request) (ListQuery, bool) {
	v := r.URL.Query()
	q := ListQuery{}
	if s := v.Get("day"); s != "" {
		n, err := strconv.Atoi(s)
		if err != nil || n < 1 || n > 31 {
			writeAPIErr(w, 400, "invalid_day", "day must be between 1 and 31")
			return q, false
		}
		q.Day = &n
	}
	if s := v.Get("active"); s != "" {
		b, err := strconv.ParseBool(s)
		if err != nil {
			writeAPIErr(w, 400, "invalid_active", "active must be true or false")
			return q, false
		}
		q.Active = &b
	}
	if s := v.Get("limit"); s != "" {
		n, err := strconv.Atoi(s)
		if err != nil || n <= 0 {
			writeAPIErr(w, 400, "invalid_limit", "limit must be positive")
			return q, false
		}
		q.Limit = n
	}
	if s := v.Get("cursor"); s != "" {
		n, err := strconv.ParseInt(s, 10, 64)
		if err != nil || n <= 0 {
			writeAPIErr(w, 400, "invalid_cursor", "cursor must be positive")
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
		writeAPIErr(w, 404, "menu_preparation_not_found", "Menu preparation not found")
	case errors.Is(err, ErrConflict):
		writeAPIErr(w, 409, "menu_preparation_conflict", "Menu already has this preparation for the day and meal")
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
