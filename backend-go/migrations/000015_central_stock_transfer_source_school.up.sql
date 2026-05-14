ALTER TABLE central_stock_movements
    ADD COLUMN IF NOT EXISTS source_school_id bigint;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'central_stock_movements_source_school_fkey'
    ) THEN
        ALTER TABLE central_stock_movements
            ADD CONSTRAINT central_stock_movements_source_school_fkey
            FOREIGN KEY (tenant_id, source_school_id) REFERENCES schools(tenant_id, id) ON DELETE RESTRICT;
    END IF;
END $$;

ALTER TABLE central_stock_movements
    DROP CONSTRAINT IF EXISTS central_stock_movements_transfer_school_required;

ALTER TABLE central_stock_movements
    ADD CONSTRAINT central_stock_movements_transfer_school_required
    CHECK (movement_type <> 'transferencia' OR destination_school_id IS NOT NULL OR source_school_id IS NOT NULL);
