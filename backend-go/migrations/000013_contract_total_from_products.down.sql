ALTER TABLE contracts ADD COLUMN IF NOT EXISTS total_amount numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS available_balance numeric(14,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_total_amount_non_negative') THEN
        ALTER TABLE contracts ADD CONSTRAINT contracts_total_amount_non_negative CHECK (total_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_available_balance_non_negative') THEN
        ALTER TABLE contracts ADD CONSTRAINT contracts_available_balance_non_negative CHECK (available_balance >= 0);
    END IF;
END $$;
