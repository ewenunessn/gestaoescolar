package menudemands

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
)

type ServiceContract interface {
	Calculate(context.Context, CalculateRequest) (CalculateResponse, error)
}

type Handler struct{ service ServiceContract }

func NewHandler(service ServiceContract) Handler { return Handler{service: service} }

func (h Handler) Calculate(w http.ResponseWriter, r *http.Request) {
	var req CalculateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAPIErr(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON")
		return
	}
	result, err := h.service.Calculate(r.Context(), req)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": result})
}

func writeErr(w http.ResponseWriter, err error) {
	var ve ValidationError
	switch {
	case errors.As(err, &ve):
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": map[string]any{"code": "validation_failed", "message": "Request validation failed", "fields": ve.Fields}})
	case errors.Is(err, ErrNoMenus):
		writeAPIErr(w, http.StatusNotFound, "no_active_menus", "No active menus with meals were found for the requested competence")
	default:
		writeAPIErr(w, http.StatusInternalServerError, "internal_error", "Internal server error")
	}
}

func writeAPIErr(w http.ResponseWriter, code int, c, m string) {
	writeJSON(w, code, map[string]any{"error": map[string]string{"code": c, "message": m}})
}

func writeJSON(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}
