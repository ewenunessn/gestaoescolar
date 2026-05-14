ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_total_amount_non_negative;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_available_balance_non_negative;

ALTER TABLE contracts DROP COLUMN IF EXISTS total_amount;
ALTER TABLE contracts DROP COLUMN IF EXISTS available_balance;
