CREATE TABLE IF NOT EXISTS app_users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text NOT NULL,
    name text NOT NULL,
    password_hash text,
    status text NOT NULL DEFAULT 'invited',
    email_verified_at timestamptz,
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT app_users_email_not_blank CHECK (btrim(email) <> ''),
    CONSTRAINT app_users_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT app_users_status_valid CHECK (status IN ('invited', 'active', 'disabled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_unique_idx ON app_users (lower(email));
CREATE INDEX IF NOT EXISTS app_users_status_idx ON app_users (status, id);

CREATE TABLE IF NOT EXISTS tenant_memberships (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role text NOT NULL,
    status text NOT NULL DEFAULT 'invited',
    invited_at timestamptz NOT NULL DEFAULT now(),
    joined_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tenant_memberships_role_valid CHECK (role IN ('owner', 'admin', 'member')),
    CONSTRAINT tenant_memberships_status_valid CHECK (status IN ('invited', 'active', 'disabled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_memberships_tenant_user_unique_idx ON tenant_memberships (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS tenant_memberships_user_idx ON tenant_memberships (user_id, status);
CREATE INDEX IF NOT EXISTS tenant_memberships_tenant_status_idx ON tenant_memberships (tenant_id, status, id);

CREATE TABLE IF NOT EXISTS tenant_invitations (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email text NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    accepted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tenant_invitations_email_not_blank CHECK (btrim(email) <> ''),
    CONSTRAINT tenant_invitations_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT tenant_invitations_role_valid CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_invitations_token_hash_unique_idx ON tenant_invitations (token_hash);
CREATE INDEX IF NOT EXISTS tenant_invitations_tenant_email_idx ON tenant_invitations (tenant_id, lower(email), accepted_at);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    access_token_hash text NOT NULL,
    refresh_token_hash text NOT NULL,
    user_agent text,
    ip_address text,
    access_expires_at timestamptz NOT NULL,
    refresh_expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_access_token_hash_unique_idx ON auth_sessions (access_token_hash);
CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_refresh_token_hash_unique_idx ON auth_sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS auth_sessions_user_tenant_idx ON auth_sessions (user_id, tenant_id, revoked_at);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'app_users_set_updated_at') THEN
        CREATE TRIGGER app_users_set_updated_at BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tenant_memberships_set_updated_at') THEN
        CREATE TRIGGER tenant_memberships_set_updated_at BEFORE UPDATE ON tenant_memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'auth_sessions_set_updated_at') THEN
        CREATE TRIGGER auth_sessions_set_updated_at BEFORE UPDATE ON auth_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
