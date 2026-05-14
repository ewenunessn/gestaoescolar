package auth

import "time"

type CreateOrganizationRequest struct {
	OrganizationName string `json:"organizationName"`
	OrganizationSlug string `json:"organizationSlug"`
	AdminName        string `json:"adminName"`
	AdminEmail       string `json:"adminEmail"`
}

type AcceptInviteRequest struct {
	Token    string `json:"token"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

type LoginRequest struct {
	TenantSlug string `json:"tenantSlug"`
	Email      string `json:"email"`
	Password   string `json:"password"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type InviteUserRequest struct {
	Name    string        `json:"name"`
	Email   string        `json:"email"`
	Role    string        `json:"role"`
	Schools []SchoolGrant `json:"schools"`
}

type SchoolGrant struct {
	SchoolID int64  `json:"schoolId"`
	Role     string `json:"role"`
}

type InviteUserResponse struct {
	InvitationID    int64         `json:"invitationId"`
	InvitationToken string        `json:"invitationToken"`
	Email           string        `json:"email"`
	Role            string        `json:"role"`
	ExpiresAt       time.Time     `json:"expiresAt"`
	Schools         []SchoolGrant `json:"schools,omitempty"`
}

type SetUserSchoolsRequest struct {
	Schools []SchoolGrant `json:"schools"`
}

type AuthUser struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type AuthTenant struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type AuthMembership struct {
	Role   string `json:"role"`
	Status string `json:"status"`
}

type SchoolAccess struct {
	SchoolID   int64  `json:"schoolId"`
	SchoolName string `json:"schoolName,omitempty"`
	Role       string `json:"role"`
}

type AuthResponse struct {
	AccessToken      string         `json:"accessToken"`
	RefreshToken     string         `json:"refreshToken"`
	TokenType        string         `json:"tokenType"`
	AccessExpiresAt  time.Time      `json:"accessExpiresAt"`
	RefreshExpiresAt time.Time      `json:"refreshExpiresAt"`
	User             AuthUser       `json:"user"`
	Tenant           AuthTenant     `json:"tenant"`
	Membership       AuthMembership `json:"membership"`
	Schools          []SchoolAccess `json:"schools,omitempty"`
}

type OrganizationBootstrap struct {
	TenantID        string    `json:"tenantId"`
	TenantName      string    `json:"tenantName"`
	TenantSlug      string    `json:"tenantSlug"`
	InvitationToken string    `json:"invitationToken"`
	InvitationID    int64     `json:"invitationId"`
	ExpiresAt       time.Time `json:"expiresAt"`
}

type CurrentUserResponse struct {
	User       AuthUser       `json:"user"`
	Tenant     AuthTenant     `json:"tenant"`
	Membership AuthMembership `json:"membership"`
	Schools    []SchoolAccess `json:"schools,omitempty"`
}

type principal struct {
	UserID     int64
	UserName   string
	UserEmail  string
	TenantID   string
	TenantName string
	TenantSlug string
	Role       string
	Status     string
	Schools    []SchoolAccess
}
