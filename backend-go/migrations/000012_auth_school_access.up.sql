CREATE TABLE IF NOT EXISTS user_school_access (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    school_id bigint NOT NULL,
    access_role text NOT NULL DEFAULT 'school_user',
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_school_access_school_fkey
        FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT user_school_access_role_valid CHECK (access_role IN ('school_admin', 'school_user', 'viewer'))
);

CREATE UNIQUE INDEX IF NOT EXISTS user_school_access_active_unique_idx
    ON user_school_access (tenant_id, user_id, school_id)
    WHERE active = true;

CREATE INDEX IF NOT EXISTS user_school_access_user_idx
    ON user_school_access (tenant_id, user_id, active);

CREATE INDEX IF NOT EXISTS user_school_access_school_idx
    ON user_school_access (tenant_id, school_id, active);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_school_access_set_updated_at') THEN
        CREATE TRIGGER user_school_access_set_updated_at
        BEFORE UPDATE ON user_school_access
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
