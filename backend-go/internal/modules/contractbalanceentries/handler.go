package contractbalanceentries

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
	Create(context.Context, int64, CreateRequest) (ContractBalanceEntry, error)
	GetByID(context.Context, int64, int64) (ContractBalanceEntry, error)
	List(context.Context, int64, ListQuery) ([]ContractBalanceEntry, *int64, error)
	Summary(context.Context, int64) ([]BalanceSummaryItem, error)
}

type Handler struct{ service ServiceContract }

func NewHandler(s ServiceContract) Handler { return Handler{service: s} }

func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	contractID, ok := parseParamID(w, r, "contractId")
	if !ok {
		return
	}
	q, ok := parseList(w, r)
	if !ok {
		return
	}
	items, next, err := h.service.List(r.Context(), contractID, q)
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

func (h Handler) Summary(w http.ResponseWriter, r *http.Request) {
	contractID, ok := parseParamID(w, r, "contractId")
	if !ok {
		return
	}
	items, err := h.service.Summary(r.Context(), contractID)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": items})
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
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": item})
}

func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	contractID, ok := parseParamID(w, r, "contractId")
	if !ok {
		return
	}
	var req CreateRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	item, err := h.service.Create(r.Context(), contractID, req)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 201, map[string]any{"data": item})
}

func parseParamID(w http.ResponseWriter, r *http.Request, param string) (int64, bool) {
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
	if value := strings.TrimSpace(values.Get("contractProductId")); value != "" {
		id, err := strconv.ParseInt(value, 10, 64)
		if err != nil || id <= 0 {
			writeAPIErr(w, 400, "invalid_contract_product", "contractProductId must be positive")
			return q, false
		}
		q.ContractProductID = &id
	}
	if value := strings.TrimSpace(values.Get("financialModalityId")); value != "" {
		id, err := strconv.ParseInt(value, 10, 64)
		if err != nil || id <= 0 {
			writeAPIErr(w, 400, "invalid_financial_modality", "financialModalityId must be positive")
			return q, false
		}
		q.FinancialModalityID = &id
	}
	if value := strings.TrimSpace(values.Get("entryType")); value != "" {
		entryType, ok := parseEntryType(value)
		if !ok {
			writeAPIErr(w, 400, "invalid_entry_type", "invalid entryType")
			return q, false
		}
		q.EntryType = &entryType
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
		writeAPIErr(w, 404, "contract_balance_entry_not_found", "Contract balance entry not found")
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
