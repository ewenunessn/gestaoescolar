ALTER TABLE tenant_invitations
ADD COLUMN IF NOT EXISTS school_access jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenant_invitations_school_access_array'
    ) THEN
        ALTER TABLE tenant_invitations
        ADD CONSTRAINT tenant_invitations_school_access_array
        CHECK (jsonb_typeof(school_access) = 'array');
    END IF;
END $$;
