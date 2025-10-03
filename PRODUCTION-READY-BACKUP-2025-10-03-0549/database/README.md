# SBS Unity v3 — Database Documentation

All database schemas, migrations, and related SQL scripts live here.

## Core Schema

**schema.sql** (root) — master database definition for the production D1 instance.

## Migrations

Applied migrations are archived under `migrations/` for historical reference:

- `migration-standardization.sql` — normalized table and column naming (Oct 1, 2025)
- `migration-add-indexes.sql` — performance indexes on frequently queried columns
- `db-indexes-working.sql` — early index prototype
- `db-performance-boost.sql` — additional query optimizations

## Duplicate Schemas

- `schema-sell-cases.sql` — earlier version of sell_cases table definition; should merge into main `schema.sql` if discrepancies exist.

## Next Steps

1. **Consolidate schemas:** Review `schema-sell-cases.sql` and fold any missing columns or constraints into the master `schema.sql`.
2. **Drop redundancy:** Once consolidated, remove or archive the duplicate schema file.
3. **Migration best practices:** New migrations should be numbered (e.g., `001-migration-name.sql`) and documented in a `MIGRATION_LOG.md` for easy rollback tracking.
