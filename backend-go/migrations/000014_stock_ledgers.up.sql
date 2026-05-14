CREATE TABLE IF NOT EXISTS central_stock_movements (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    product_id bigint NOT NULL,
    movement_type text NOT NULL,
    quantity numeric(14,3) NOT NULL,
    quantity_delta numeric(14,3) NOT NULL,
    occurred_at date NOT NULL,
    description text,
    reference_document text,
    source_school_id bigint,
    destination_school_id bigint,
    transfer_group_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT central_stock_movements_product_fkey
        FOREIGN KEY (tenant_id, product_id) REFERENCES products(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT central_stock_movements_source_school_fkey
        FOREIGN KEY (tenant_id, source_school_id) REFERENCES schools(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT central_stock_movements_destination_school_fkey
        FOREIGN KEY (tenant_id, destination_school_id) REFERENCES schools(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT central_stock_movements_type_valid
        CHECK (movement_type IN ('entrada', 'saida', 'transferencia', 'ajuste')),
    CONSTRAINT central_stock_movements_quantity_positive CHECK (quantity > 0),
    CONSTRAINT central_stock_movements_delta_not_zero CHECK (quantity_delta <> 0),
    CONSTRAINT central_stock_movements_transfer_school_required
        CHECK (movement_type <> 'transferencia' OR destination_school_id IS NOT NULL OR source_school_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS central_stock_movements_tenant_id_unique_idx
    ON central_stock_movements (tenant_id, id);
CREATE INDEX IF NOT EXISTS central_stock_movements_tenant_product_idx
    ON central_stock_movements (tenant_id, product_id, id);
CREATE INDEX IF NOT EXISTS central_stock_movements_transfer_group_idx
    ON central_stock_movements (tenant_id, transfer_group_id)
    WHERE transfer_group_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS school_stock_movements (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    school_id bigint NOT NULL,
    product_id bigint NOT NULL,
    movement_type text NOT NULL,
    quantity numeric(14,3) NOT NULL,
    quantity_delta numeric(14,3) NOT NULL,
    occurred_at date NOT NULL,
    description text,
    reference_document text,
    source_school_id bigint,
    destination_school_id bigint,
    transfer_group_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT school_stock_movements_school_fkey
        FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT school_stock_movements_product_fkey
        FOREIGN KEY (tenant_id, product_id) REFERENCES products(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT school_stock_movements_source_school_fkey
        FOREIGN KEY (tenant_id, source_school_id) REFERENCES schools(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT school_stock_movements_destination_school_fkey
        FOREIGN KEY (tenant_id, destination_school_id) REFERENCES schools(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT school_stock_movements_type_valid
        CHECK (movement_type IN ('entrada', 'saida', 'transferencia', 'ajuste')),
    CONSTRAINT school_stock_movements_quantity_positive CHECK (quantity > 0),
    CONSTRAINT school_stock_movements_delta_not_zero CHECK (quantity_delta <> 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS school_stock_movements_tenant_id_unique_idx
    ON school_stock_movements (tenant_id, id);
CREATE INDEX IF NOT EXISTS school_stock_movements_tenant_school_product_idx
    ON school_stock_movements (tenant_id, school_id, product_id, id);
CREATE INDEX IF NOT EXISTS school_stock_movements_transfer_group_idx
    ON school_stock_movements (tenant_id, transfer_group_id)
    WHERE transfer_group_id IS NOT NULL;

ALTER TABLE central_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS central_stock_movements_tenant_isolation ON central_stock_movements;
CREATE POLICY central_stock_movements_tenant_isolation ON central_stock_movements
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS school_stock_movements_tenant_isolation ON school_stock_movements;
CREATE POLICY school_stock_movements_tenant_isolation ON school_stock_movements
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE central_stock_movements FORCE ROW LEVEL SECURITY;
ALTER TABLE school_stock_movements FORCE ROW LEVEL SECURITY;
