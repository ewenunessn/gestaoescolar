package auth

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/ewenunessn/gestaoescolar/backend-go/internal/database"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type Repository struct{ db database.DBTX }

func NewRepository(db database.DBTX) *Repository { return &Repository{db: db} }

type createOrganizationInput struct {
	OrganizationName string
	OrganizationSlug string
	AdminName        string
	AdminEmail       string
	Role             string
	TokenHash        string
	ExpiresAt        time.Time
}

type organizationInvite struct {
	TenantID     string
	TenantName   string
	TenantSlug   string
	InvitationID int64
}

type createUserInviteInput struct {
	TenantID  string
	Name      string
	Email     string
	Role      string
	TokenHash string
	ExpiresAt time.Time
	Schools   []SchoolGrant
}

type userInvite struct {
	InvitationID int64
}

type replaceUserSchoolsInput struct {
	TenantID string
	UserID   int64
	Schools  []SchoolGrant
}

type acceptInviteInput struct {
	TokenHash    string
	Name         string
	PasswordHash string
	AcceptedAt   time.Time
}

type loginPrincipal struct {
	principal
	PasswordHash string
}

type createSessionInput struct {
	UserID           int64
	TenantID         string
	AccessTokenHash  string
	RefreshTokenHash string
	UserAgent        string
	IPAddress        string
	AccessExpiresAt  time.Time
	RefreshExpiresAt time.Time
}

type rotateSessionInput struct {
	OldRefreshTokenHash string
	AccessTokenHash     string
	RefreshTokenHash    string
	UserAgent           string
	IPAddress           string
	AccessExpiresAt     time.Time
	RefreshExpiresAt    time.Time
}

func (r *Repository) CreateOrganizationInvite(ctx context.Context, in createOrganizationInput) (organizationInvite, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	var out organizationInvite
	err := db.QueryRow(ctx, `
		WITH tenant_insert AS (
			INSERT INTO tenants (name, slug, active)
			VALUES ($1, $2, true)
			RETURNING id, name, slug
		), invite_insert AS (
			INSERT INTO tenant_invitations (tenant_id, email, name, role, token_hash, expires_at)
			SELECT id, $3, $4, $5, $6, $7 FROM tenant_insert
			RETURNING id, tenant_id
		)
		SELECT t.id::text, t.name, t.slug, i.id
		FROM tenant_insert t
		JOIN invite_insert i ON i.tenant_id = t.id
	`, in.OrganizationName, in.OrganizationSlug, in.AdminEmail, in.AdminName, in.Role, in.TokenHash, in.ExpiresAt).Scan(&out.TenantID, &out.TenantName, &out.TenantSlug, &out.InvitationID)
	if err != nil {
		return organizationInvite{}, mapErr(err)
	}
	return out, nil
}

func (r *Repository) CreateUserInvite(ctx context.Context, in createUserInviteInput) (userInvite, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	var out userInvite
	schools, err := json.Marshal(in.Schools)
	if err != nil {
		return userInvite{}, err
	}
	err = db.QueryRow(ctx, `
		WITH invite_insert AS (
			INSERT INTO tenant_invitations (tenant_id, email, name, role, token_hash, expires_at, school_access)
			VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
			RETURNING id
		)
		SELECT id FROM invite_insert
	`, in.TenantID, in.Email, in.Name, in.Role, in.TokenHash, in.ExpiresAt, string(schools)).Scan(&out.InvitationID)
	if err != nil {
		return userInvite{}, mapErr(err)
	}
	return out, nil
}

func (r *Repository) AcceptInvite(ctx context.Context, in acceptInviteInput) (principal, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	var p principal
	err := db.QueryRow(ctx, `
		WITH invitation AS (
			SELECT i.id, i.tenant_id, i.email, i.name, i.role, COALESCE(i.school_access, '[]'::jsonb) AS school_access, t.name AS tenant_name, t.slug
			FROM tenant_invitations i
			JOIN tenants t ON t.id = i.tenant_id
			WHERE i.token_hash = $1
			  AND i.accepted_at IS NULL
			  AND i.expires_at > now()
			  AND t.active = true
			FOR UPDATE
		), user_upsert AS (
			INSERT INTO app_users (email, name, password_hash, status, email_verified_at)
			SELECT email, $2, $3, 'active', $4 FROM invitation
			ON CONFLICT (lower(email)) DO UPDATE
			SET name = EXCLUDED.name,
			    password_hash = EXCLUDED.password_hash,
			    status = 'active',
			    email_verified_at = COALESCE(app_users.email_verified_at, EXCLUDED.email_verified_at),
			    updated_at = now()
			RETURNING id, email, name
		), membership_upsert AS (
			INSERT INTO tenant_memberships (tenant_id, user_id, role, status, joined_at)
			SELECT invitation.tenant_id, user_upsert.id, invitation.role, 'active', $4
			FROM invitation, user_upsert
			ON CONFLICT (tenant_id, user_id) DO UPDATE
			SET role = EXCLUDED.role,
			    status = 'active',
			    joined_at = COALESCE(tenant_memberships.joined_at, EXCLUDED.joined_at),
			    updated_at = now()
			RETURNING tenant_id, user_id, role, status
		), school_access_insert AS (
			INSERT INTO user_school_access (tenant_id, user_id, school_id, access_role, active)
			SELECT invitation.tenant_id, user_upsert.id, (grant_row.value->>'schoolId')::bigint, COALESCE(NULLIF(grant_row.value->>'role', ''), 'school_user'), true
			FROM invitation, user_upsert, jsonb_array_elements(invitation.school_access) AS grant_row(value)
			WHERE NULLIF(grant_row.value->>'schoolId', '') IS NOT NULL
			ON CONFLICT (tenant_id, user_id, school_id) WHERE active = true
			DO UPDATE SET access_role = EXCLUDED.access_role, active = true, updated_at = now()
		), accepted AS (
			UPDATE tenant_invitations
			SET accepted_at = $4
			WHERE id = (SELECT id FROM invitation)
		)
		SELECT u.id, u.name, u.email, m.tenant_id::text, i.tenant_name, i.slug, m.role, m.status
		FROM user_upsert u
		JOIN membership_upsert m ON m.user_id = u.id
		JOIN invitation i ON i.tenant_id = m.tenant_id
	`, in.TokenHash, in.Name, in.PasswordHash, in.AcceptedAt).Scan(&p.UserID, &p.UserName, &p.UserEmail, &p.TenantID, &p.TenantName, &p.TenantSlug, &p.Role, &p.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return principal{}, ErrInvalidToken
	}
	if err == nil {
		p.Schools, err = r.listSchoolAccess(ctx, p.TenantID, p.UserID)
	}
	return p, err
}

func (r *Repository) ReplaceUserSchoolAccess(ctx context.Context, in replaceUserSchoolsInput) ([]SchoolAccess, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	if _, err := db.Exec(ctx, `update user_school_access set active=false, updated_at=now() where tenant_id=$1 and user_id=$2 and active=true`, in.TenantID, in.UserID); err != nil {
		return nil, err
	}
	for _, school := range in.Schools {
		if _, err := db.Exec(ctx, `
			INSERT INTO user_school_access (tenant_id, user_id, school_id, access_role, active)
			VALUES ($1, $2, $3, $4, true)
			ON CONFLICT (tenant_id, user_id, school_id) WHERE active = true
			DO UPDATE SET access_role = EXCLUDED.access_role, active = true, updated_at = now()
		`, in.TenantID, in.UserID, school.SchoolID, school.Role); err != nil {
			return nil, mapErr(err)
		}
	}
	return r.listSchoolAccess(ctx, in.TenantID, in.UserID)
}

func (r *Repository) FindLoginPrincipal(ctx context.Context, slug string, email string) (loginPrincipal, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	var p loginPrincipal
	err := db.QueryRow(ctx, `
		SELECT u.id, u.name, u.email, t.id::text, t.name, t.slug, m.role, m.status, u.password_hash
		FROM app_users u
		JOIN tenant_memberships m ON m.user_id = u.id
		JOIN tenants t ON t.id = m.tenant_id
		WHERE lower(u.email) = lower($1)
		  AND lower(t.slug) = lower($2)
		  AND u.status = 'active'
		  AND m.status = 'active'
		  AND t.active = true
	`, email, slug).Scan(&p.UserID, &p.UserName, &p.UserEmail, &p.TenantID, &p.TenantName, &p.TenantSlug, &p.Role, &p.Status, &p.PasswordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return loginPrincipal{}, ErrInvalidCredentials
	}
	if err == nil {
		p.Schools, err = r.listSchoolAccess(ctx, p.TenantID, p.UserID)
	}
	return p, err
}

func (r *Repository) CreateSession(ctx context.Context, in createSessionInput) error {
	db := database.ExecutorFromContext(ctx, r.db)
	_, err := db.Exec(ctx, `insert into auth_sessions (user_id,tenant_id,access_token_hash,refresh_token_hash,user_agent,ip_address,access_expires_at,refresh_expires_at) values ($1,$2,$3,$4,$5,$6,$7,$8)`, in.UserID, in.TenantID, in.AccessTokenHash, in.RefreshTokenHash, nullable(in.UserAgent), nullable(in.IPAddress), in.AccessExpiresAt, in.RefreshExpiresAt)
	return err
}

func (r *Repository) FindByRefreshToken(ctx context.Context, hash string) (principal, error) {
	return r.findByToken(ctx, "refresh", hash)
}

func (r *Repository) FindByAccessToken(ctx context.Context, hash string) (principal, error) {
	return r.findByToken(ctx, "access", hash)
}

func (r *Repository) findByToken(ctx context.Context, kind string, hash string) (principal, error) {
	tokenColumn := "s.access_token_hash"
	expiresColumn := "s.access_expires_at"
	if kind == "refresh" {
		tokenColumn = "s.refresh_token_hash"
		expiresColumn = "s.refresh_expires_at"
	}
	db := database.ExecutorFromContext(ctx, r.db)
	var p principal
	err := db.QueryRow(ctx, `
		SELECT u.id, u.name, u.email, t.id::text, t.name, t.slug, m.role, m.status
		FROM auth_sessions s
		JOIN app_users u ON u.id = s.user_id
		JOIN tenants t ON t.id = s.tenant_id
		JOIN tenant_memberships m ON m.tenant_id = t.id AND m.user_id = u.id
		WHERE `+tokenColumn+` = $1
		  AND `+expiresColumn+` > now()
		  AND s.revoked_at IS NULL
		  AND u.status = 'active'
		  AND m.status = 'active'
		  AND t.active = true
	`, hash).Scan(&p.UserID, &p.UserName, &p.UserEmail, &p.TenantID, &p.TenantName, &p.TenantSlug, &p.Role, &p.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return principal{}, ErrInvalidToken
	}
	if err == nil {
		p.Schools, err = r.listSchoolAccess(ctx, p.TenantID, p.UserID)
	}
	return p, err
}

func (r *Repository) listSchoolAccess(ctx context.Context, tenantID string, userID int64) ([]SchoolAccess, error) {
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, `
		SELECT usa.school_id, usa.access_role
		FROM user_school_access usa
		WHERE usa.tenant_id = $1
		  AND usa.user_id = $2
		  AND usa.active = true
		ORDER BY usa.school_id
	`, tenantID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []SchoolAccess{}
	for rows.Next() {
		var item SchoolAccess
		if err := rows.Scan(&item.SchoolID, &item.Role); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) RotateSession(ctx context.Context, in rotateSessionInput) error {
	db := database.ExecutorFromContext(ctx, r.db)
	tag, err := db.Exec(ctx, `update auth_sessions set access_token_hash=$2, refresh_token_hash=$3, access_expires_at=$4, refresh_expires_at=$5, user_agent=$6, ip_address=$7, updated_at=now() where refresh_token_hash=$1 and refresh_expires_at > now() and revoked_at is null`, in.OldRefreshTokenHash, in.AccessTokenHash, in.RefreshTokenHash, in.AccessExpiresAt, in.RefreshExpiresAt, nullable(in.UserAgent), nullable(in.IPAddress))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrInvalidToken
	}
	return nil
}

func (r *Repository) RevokeByRefreshToken(ctx context.Context, hash string) error {
	db := database.ExecutorFromContext(ctx, r.db)
	_, err := db.Exec(ctx, `update auth_sessions set revoked_at=now(), updated_at=now() where refresh_token_hash=$1 and revoked_at is null`, hash)
	return err
}

func nullable(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func mapErr(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrConflict
	}
	return err
}
