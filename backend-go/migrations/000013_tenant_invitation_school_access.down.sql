ALTER TABLE tenant_invitations
DROP CONSTRAINT IF EXISTS tenant_invitations_school_access_array;

ALTER TABLE tenant_invitations
DROP COLUMN IF EXISTS school_access;
