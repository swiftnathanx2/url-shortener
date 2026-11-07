CREATE TABLE IF NOT EXISTS links (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(16) UNIQUE NOT NULL,
    target_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    click_count INTEGER NOT NULL DEFAULT 0 CHECK(click_count >= 0)
);

CREATE TABLE IF NOT EXISTS clicks(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    link_id INTEGER REFERENCES links(id) ON DELETE CASCADE,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    referrer TEXT,
    user_agent TEXT
);

CREATE INDEX  idx_click_link ON clicks (link_id, clicked_at);