CREATE TABLE IF NOT EXISTS app_metadata (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_metadata (key, value)
VALUES ('backend_go_schema', 'initialized')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();
