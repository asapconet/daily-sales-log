CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL CHECK (char_length(item_name) BETWEEN 1 AND 120),
    amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sales_created_at_idx ON sales (created_at);
