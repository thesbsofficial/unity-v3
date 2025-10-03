-- Add indexes for unified account queries
-- Execute after database standardization

-- Index for finding user's sell cases
CREATE INDEX IF NOT EXISTS idx_sell_cases_user_id ON sell_cases(user_id);

-- Indexes for linking orphaned cases to accounts
CREATE INDEX IF NOT EXISTS idx_sell_cases_email ON sell_cases(email);
CREATE INDEX IF NOT EXISTS idx_sell_cases_social_handle ON sell_cases(social_handle);

-- Index for finding cases by status (admin queries)
CREATE INDEX IF NOT EXISTS idx_sell_cases_status ON sell_cases(status);

-- Index for chronological queries
CREATE INDEX IF NOT EXISTS idx_sell_cases_created ON sell_cases(created_at);

-- Composite index for user's cases by status
CREATE INDEX IF NOT EXISTS idx_sell_cases_user_status ON sell_cases(user_id, status);

-- Verify indexes were created
SELECT name, tbl_name FROM sqlite_master 
WHERE type='index' AND tbl_name IN ('users', 'orders', 'sell_cases', 'sessions')
ORDER BY tbl_name, name;
