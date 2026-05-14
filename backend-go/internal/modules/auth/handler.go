package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)

const setupTokenHeader = "X-Setup-Token"

type ServiceContract interface {
	CreateOrganization(context.Context, string, CreateOrganizationRequest) (OrganizationBootstrap, error)
	AcceptInvite(context.Context, AcceptInviteRequest, sessionMeta) (AuthResponse, error)
	Login(context.Context, LoginRequest, sessionMeta) (AuthResponse, error)
	Refresh(context.Context, RefreshRequest, sessionMeta) (AuthResponse, error)
	Logout(context.Context, LogoutRequest) error
	Me(context.Context, string) (CurrentUserResponse, error)
	InviteUser(context.Context, string, InviteUserRequest) (InviteUserResponse, error)
	SetUserSchools(context.Context, string, int64, SetUserSchoolsRequest) ([]SchoolAccess, error)
}

type sessionMeta struct {
	UserAgent string
	IPAddress string
}

type Handler struct{ service ServiceContract }

func NewHandler(service ServiceContract) Handler { return Handler{service: service} }

func (h Handler) CreateOrganization(w http.ResponseWriter, r *http.Request) {
	var req CreateOrganizationRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	result, err := h.service.CreateOrganization(r.Context(), r.Header.Get(setupTokenHeader), req)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 201, map[string]any{"data": result})
}

func (h Handler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	var req AcceptInviteRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	result, err := h.service.AcceptInvite(r.Context(), req, metaFromRequest(r))
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": result})
}

func (h Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	result, err := h.service.Login(r.Context(), req, metaFromRequest(r))
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": result})
}

func (h Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	result, err := h.service.Refresh(r.Context(), req, metaFromRequest(r))
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": result})
}

func (h Handler) Logout(w http.ResponseWriter, r *http.Request) {
	var req LogoutRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	if err := h.service.Logout(r.Context(), req); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": map[string]bool{"ok": true}})
}

func (h Handler) Me(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.Me(r.Context(), r.Header.Get("Authorization"))
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": result})
}

func (h Handler) InviteUser(w http.ResponseWriter, r *http.Request) {
	var req InviteUserRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	result, err := h.service.InviteUser(r.Context(), r.Header.Get("Authorization"), req)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 201, map[string]any{"data": result})
}

func (h Handler) SetUserSchools(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "userId"), 10, 64)
	if err != nil || id <= 0 {
		writeAPIErr(w, 400, "invalid_user", "userId must be positive")
		return
	}
	var req SetUserSchoolsRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeAPIErr(w, 400, "invalid_json", "Request body must be valid JSON")
		return
	}
	result, err := h.service.SetUserSchools(r.Context(), r.Header.Get("Authorization"), id, req)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"data": result})
}

func metaFromRequest(r *http.Request) sessionMeta {
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	}
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		ip = strings.TrimSpace(strings.Split(forwarded, ",")[0])
	}
	return sessionMeta{UserAgent: r.UserAgent(), IPAddress: ip}
}

func writeErr(w http.ResponseWriter, err error) {
	var ve ValidationError
	switch {
	case errors.As(err, &ve):
		writeJSON(w, 400, map[string]any{"error": map[string]any{"code": "validation_failed", "message": "Request validation failed", "fields": ve.Fields}})
	case errors.Is(err, ErrForbidden):
		writeAPIErr(w, 403, "forbidden", "Forbidden")
	case errors.Is(err, ErrSetupDisabled):
		writeAPIErr(w, 403, "setup_disabled", "Setup token is not configured")
	case errors.Is(err, ErrInvalidCredentials):
		writeAPIErr(w, 401, "invalid_credentials", "Invalid credentials")
	case errors.Is(err, ErrInvalidToken):
		writeAPIErr(w, 401, "invalid_token", "Invalid or expired token")
	case errors.Is(err, ErrConflict):
		writeAPIErr(w, 409, "auth_conflict", "Resource already exists")
	default:
		writeAPIErr(w, 500, "internal_error", "Internal server error")
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
