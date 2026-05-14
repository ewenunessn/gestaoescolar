package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/mail"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidToken       = errors.New("invalid token")
	ErrForbidden          = errors.New("forbidden")
	ErrSetupDisabled      = errors.New("setup token is not configured")
	ErrConflict           = errors.New("auth conflict")
)

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	CreateOrganizationInvite(context.Context, createOrganizationInput) (organizationInvite, error)
	CreateUserInvite(context.Context, createUserInviteInput) (userInvite, error)
	ReplaceUserSchoolAccess(context.Context, replaceUserSchoolsInput) ([]SchoolAccess, error)
	AcceptInvite(context.Context, acceptInviteInput) (principal, error)
	FindLoginPrincipal(context.Context, string, string) (loginPrincipal, error)
	CreateSession(context.Context, createSessionInput) error
	FindByRefreshToken(context.Context, string) (principal, error)
	RotateSession(context.Context, rotateSessionInput) error
	RevokeByRefreshToken(context.Context, string) error
	FindByAccessToken(context.Context, string) (principal, error)
}

type Service struct {
	store      Store
	setupToken string
	now        func() time.Time
}

func NewService(store Store, setupToken string) *Service {
	return &Service{store: store, setupToken: strings.TrimSpace(setupToken), now: time.Now}
}

func (s *Service) CreateOrganization(ctx context.Context, setupToken string, req CreateOrganizationRequest) (OrganizationBootstrap, error) {
	if s.setupToken == "" {
		return OrganizationBootstrap{}, ErrSetupDisabled
	}
	if subtle.ConstantTimeCompare([]byte(strings.TrimSpace(setupToken)), []byte(s.setupToken)) != 1 {
		return OrganizationBootstrap{}, ErrForbidden
	}
	fields := map[string]string{}
	req.OrganizationName = strings.TrimSpace(req.OrganizationName)
	req.OrganizationSlug = normalizeSlug(req.OrganizationSlug)
	req.AdminName = strings.TrimSpace(req.AdminName)
	req.AdminEmail = normalizeEmail(req.AdminEmail)
	if req.OrganizationName == "" {
		fields["organizationName"] = "organizationName is required"
	}
	if req.OrganizationSlug == "" {
		fields["organizationSlug"] = "organizationSlug is required"
	}
	if req.AdminName == "" {
		fields["adminName"] = "adminName is required"
	}
	if !validEmail(req.AdminEmail) {
		fields["adminEmail"] = "adminEmail must be valid"
	}
	if len(fields) > 0 {
		return OrganizationBootstrap{}, ValidationError{Fields: fields}
	}
	rawToken, tokenHash, err := newToken()
	if err != nil {
		return OrganizationBootstrap{}, err
	}
	expiresAt := s.now().Add(7 * 24 * time.Hour)
	invite, err := s.store.CreateOrganizationInvite(ctx, createOrganizationInput{
		OrganizationName: req.OrganizationName,
		OrganizationSlug: req.OrganizationSlug,
		AdminName:        req.AdminName,
		AdminEmail:       req.AdminEmail,
		Role:             "owner",
		TokenHash:        tokenHash,
		ExpiresAt:        expiresAt,
	})
	if err != nil {
		return OrganizationBootstrap{}, err
	}
	return OrganizationBootstrap{TenantID: invite.TenantID, TenantName: invite.TenantName, TenantSlug: invite.TenantSlug, InvitationToken: rawToken, InvitationID: invite.InvitationID, ExpiresAt: expiresAt}, nil
}

func (s *Service) AcceptInvite(ctx context.Context, req AcceptInviteRequest, meta sessionMeta) (AuthResponse, error) {
	fields := map[string]string{}
	req.Token = strings.TrimSpace(req.Token)
	req.Name = strings.TrimSpace(req.Name)
	if req.Token == "" {
		fields["token"] = "token is required"
	}
	if req.Name == "" {
		fields["name"] = "name is required"
	}
	if len(req.Password) < 12 {
		fields["password"] = "password must have at least 12 characters"
	}
	if len(fields) > 0 {
		return AuthResponse{}, ValidationError{Fields: fields}
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return AuthResponse{}, err
	}
	p, err := s.store.AcceptInvite(ctx, acceptInviteInput{TokenHash: hashToken(req.Token), Name: req.Name, PasswordHash: string(passwordHash), AcceptedAt: s.now()})
	if err != nil {
		return AuthResponse{}, err
	}
	return s.issueSession(ctx, p, meta)
}

func (s *Service) InviteUser(ctx context.Context, accessToken string, req InviteUserRequest) (InviteUserResponse, error) {
	actor, err := s.Me(ctx, accessToken)
	if err != nil {
		return InviteUserResponse{}, err
	}
	if actor.Membership.Role != "owner" && actor.Membership.Role != "admin" {
		return InviteUserResponse{}, ErrForbidden
	}
	fields := map[string]string{}
	req.Name = strings.TrimSpace(req.Name)
	req.Email = normalizeEmail(req.Email)
	req.Role = strings.TrimSpace(strings.ToLower(req.Role))
	if req.Name == "" {
		fields["name"] = "name is required"
	}
	if !validEmail(req.Email) {
		fields["email"] = "email must be valid"
	}
	if !validMembershipRole(req.Role) {
		fields["role"] = "role must be owner, admin, or member"
	}
	if actor.Membership.Role != "owner" && req.Role == "owner" {
		fields["role"] = "only owners can invite another owner"
	}
	schools := normalizeSchoolGrants(req.Schools)
	if len(fields) > 0 {
		return InviteUserResponse{}, ValidationError{Fields: fields}
	}
	rawToken, tokenHash, err := newToken()
	if err != nil {
		return InviteUserResponse{}, err
	}
	expiresAt := s.now().Add(7 * 24 * time.Hour)
	invite, err := s.store.CreateUserInvite(ctx, createUserInviteInput{TenantID: actor.Tenant.ID, Name: req.Name, Email: req.Email, Role: req.Role, TokenHash: tokenHash, ExpiresAt: expiresAt, Schools: schools})
	if err != nil {
		return InviteUserResponse{}, err
	}
	return InviteUserResponse{InvitationID: invite.InvitationID, InvitationToken: rawToken, Email: req.Email, Role: req.Role, ExpiresAt: expiresAt, Schools: schools}, nil
}

func (s *Service) SetUserSchools(ctx context.Context, accessToken string, userID int64, req SetUserSchoolsRequest) ([]SchoolAccess, error) {
	actor, err := s.Me(ctx, accessToken)
	if err != nil {
		return nil, err
	}
	if actor.Membership.Role != "owner" && actor.Membership.Role != "admin" {
		return nil, ErrForbidden
	}
	if userID <= 0 {
		return nil, ValidationError{Fields: map[string]string{"userId": "userId must be positive"}}
	}
	return s.store.ReplaceUserSchoolAccess(ctx, replaceUserSchoolsInput{TenantID: actor.Tenant.ID, UserID: userID, Schools: normalizeSchoolGrants(req.Schools)})
}

func (s *Service) Login(ctx context.Context, req LoginRequest, meta sessionMeta) (AuthResponse, error) {
	req.TenantSlug = normalizeSlug(req.TenantSlug)
	req.Email = normalizeEmail(req.Email)
	if req.TenantSlug == "" || !validEmail(req.Email) || req.Password == "" {
		return AuthResponse{}, ErrInvalidCredentials
	}
	lp, err := s.store.FindLoginPrincipal(ctx, req.TenantSlug, req.Email)
	if err != nil {
		return AuthResponse{}, ErrInvalidCredentials
	}
	if bcrypt.CompareHashAndPassword([]byte(lp.PasswordHash), []byte(req.Password)) != nil {
		return AuthResponse{}, ErrInvalidCredentials
	}
	return s.issueSession(ctx, lp.principal, meta)
}

func (s *Service) Refresh(ctx context.Context, req RefreshRequest, meta sessionMeta) (AuthResponse, error) {
	req.RefreshToken = strings.TrimSpace(req.RefreshToken)
	if req.RefreshToken == "" {
		return AuthResponse{}, ErrInvalidToken
	}
	p, err := s.store.FindByRefreshToken(ctx, hashToken(req.RefreshToken))
	if err != nil {
		return AuthResponse{}, ErrInvalidToken
	}
	access, accessHash, err := newToken()
	if err != nil {
		return AuthResponse{}, err
	}
	refresh, refreshHash, err := newToken()
	if err != nil {
		return AuthResponse{}, err
	}
	accessExp, refreshExp := s.now().Add(15*time.Minute), s.now().Add(30*24*time.Hour)
	if err := s.store.RotateSession(ctx, rotateSessionInput{OldRefreshTokenHash: hashToken(req.RefreshToken), AccessTokenHash: accessHash, RefreshTokenHash: refreshHash, AccessExpiresAt: accessExp, RefreshExpiresAt: refreshExp, UserAgent: meta.UserAgent, IPAddress: meta.IPAddress}); err != nil {
		return AuthResponse{}, err
	}
	return authResponse(access, refresh, accessExp, refreshExp, p), nil
}

func (s *Service) Logout(ctx context.Context, req LogoutRequest) error {
	req.RefreshToken = strings.TrimSpace(req.RefreshToken)
	if req.RefreshToken == "" {
		return nil
	}
	return s.store.RevokeByRefreshToken(ctx, hashToken(req.RefreshToken))
}

func (s *Service) Me(ctx context.Context, accessToken string) (CurrentUserResponse, error) {
	accessToken = strings.TrimSpace(strings.TrimPrefix(accessToken, "Bearer "))
	if accessToken == "" {
		return CurrentUserResponse{}, ErrInvalidToken
	}
	p, err := s.store.FindByAccessToken(ctx, hashToken(accessToken))
	if err != nil {
		return CurrentUserResponse{}, ErrInvalidToken
	}
	return CurrentUserResponse{User: AuthUser{ID: p.UserID, Name: p.UserName, Email: p.UserEmail}, Tenant: AuthTenant{ID: p.TenantID, Name: p.TenantName, Slug: p.TenantSlug}, Membership: AuthMembership{Role: p.Role, Status: p.Status}, Schools: p.Schools}, nil
}

func (s *Service) issueSession(ctx context.Context, p principal, meta sessionMeta) (AuthResponse, error) {
	access, accessHash, err := newToken()
	if err != nil {
		return AuthResponse{}, err
	}
	refresh, refreshHash, err := newToken()
	if err != nil {
		return AuthResponse{}, err
	}
	accessExp, refreshExp := s.now().Add(15*time.Minute), s.now().Add(30*24*time.Hour)
	if err := s.store.CreateSession(ctx, createSessionInput{UserID: p.UserID, TenantID: p.TenantID, AccessTokenHash: accessHash, RefreshTokenHash: refreshHash, AccessExpiresAt: accessExp, RefreshExpiresAt: refreshExp, UserAgent: meta.UserAgent, IPAddress: meta.IPAddress}); err != nil {
		return AuthResponse{}, err
	}
	return authResponse(access, refresh, accessExp, refreshExp, p), nil
}

func authResponse(access string, refresh string, accessExp time.Time, refreshExp time.Time, p principal) AuthResponse {
	return AuthResponse{AccessToken: access, RefreshToken: refresh, TokenType: "Bearer", AccessExpiresAt: accessExp, RefreshExpiresAt: refreshExp, User: AuthUser{ID: p.UserID, Name: p.UserName, Email: p.UserEmail}, Tenant: AuthTenant{ID: p.TenantID, Name: p.TenantName, Slug: p.TenantSlug}, Membership: AuthMembership{Role: p.Role, Status: p.Status}, Schools: p.Schools}
}

func newToken() (string, string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", "", err
	}
	raw := base64.RawURLEncoding.EncodeToString(buf)
	return raw, hashToken(raw), nil
}

func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func normalizeEmail(value string) string { return strings.ToLower(strings.TrimSpace(value)) }
func normalizeSlug(value string) string  { return strings.ToLower(strings.TrimSpace(value)) }

func validMembershipRole(value string) bool {
	return value == "owner" || value == "admin" || value == "member"
}

func validSchoolRole(value string) bool {
	return value == "school_admin" || value == "school_user" || value == "viewer"
}

func normalizeSchoolGrants(items []SchoolGrant) []SchoolGrant {
	out := []SchoolGrant{}
	seen := map[int64]bool{}
	for _, item := range items {
		role := strings.TrimSpace(strings.ToLower(item.Role))
		if role == "" {
			role = "school_user"
		}
		if item.SchoolID <= 0 || seen[item.SchoolID] || !validSchoolRole(role) {
			continue
		}
		out = append(out, SchoolGrant{SchoolID: item.SchoolID, Role: role})
		seen[item.SchoolID] = true
	}
	return out
}

func validEmail(value string) bool {
	_, err := mail.ParseAddress(value)
	return err == nil && strings.Contains(value, "@")
}
