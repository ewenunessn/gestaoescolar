ALTER TABLE central_stock_movements
    DROP CONSTRAINT IF EXISTS central_stock_movements_transfer_school_required;

ALTER TABLE central_stock_movements
    ADD CONSTRAINT central_stock_movements_transfer_school_required
    CHECK (movement_type <> 'transferencia' OR destination_school_id IS NOT NULL);

ALTER TABLE central_stock_movements
    DROP CONSTRAINT IF EXISTS central_stock_movements_source_school_fkey;

ALTER TABLE central_stock_movements
    DROP COLUMN IF EXISTS source_school_id;
