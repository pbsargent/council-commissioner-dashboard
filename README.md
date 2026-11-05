# Council Commissioner Dashboard

This GitHub Pages site is a commissioner-focused subset view that uses the same look, feel, and canonical data source as the Council Dashboard Summary:

https://pbsargent.github.io/council-dashboard-summary/

Commissioner-related information should be a subset of that source of truth, not a separate embedded-data dashboard.


## Commissioner membership update — November 5, 2026

- Unit Support reads the existing canonical latest.json and full unit-level-latest.json, requires matching report dates and full tracked coverage, and offers district/program/search/follow-up filters and aggregate CSV. It never changes imported metric/retention definitions or treats unavailable as zero.
- Membership History contains two verified October month-end reports (2025 and 2026), with council/district/program reconciliation and previous-year continuity. It is dated history, separate from daily workbook trend data. Growth is not person retention.
- Member Persistence contains the validated Scout DB-maintained archive comparison for September 9–November 5, 2026 (57 days). Council people are separately deduplicated; baseline district cohorts can overlap. Pack-to-troop movement is an inference and not AoL completion. It is not an automatic daily or annual cohort.
- Measures & Sources documents definitions and the August 24, 2026 Registration Guidebook. New registration can include return after more than 12 months.

Historical CSV originals, provenance and DB archive evidence stay private, outside Git. The platform renderer validates and builds aggregate JSON only into its isolated Pages payload. Do not commit generated history or roster/member rows. Scout / Mac Pro remains the sole platform release/publication coordinator; install the renderer/pages/private archive and parity amendments together before source publication. Existing daily downloads, DB, Excel, emails, schedules and completed-run receipts are untouched.

## Expanded historical membership
Membership History uses fifteen hash-bound aggregate MMR exports: December 2016–2025; March, June, September 2026; October 2025/2026. Views keep annual year-ends, 2026 checkpoints and October comparison separate. Filters apply to charts, endpoints, tables, source list and exact coverage warnings; youth registrations and units are distinct measures. No interpolation or annual-retention claim. December 2016 prior archive is unavailable; December 2015 diagnostic is excluded. Historical Exploring council/district residuals are independently reconciled and disclosed rather than allocated or hidden. Every other program must reconcile completely. Raw historical CSVs and history-sources.json stay in private runtime storage, outside source Git and public payloads. Builder validates manifest hashes, schemas, partitions and all overlapping prior-year cells. Existing persistence remains the same dated Scout DB cohort. Sole Scout/Mac Pro publisher installs the matching runtime/manifest/parity amendment before portal-only release.

## District unit review
Unit Support groups the complete filtered unit detail by district. Districts start collapsed, show their matching-unit count and use native keyboard-accessible disclosures. Expand/collapse all and per-district controls affect presentation only; filters, totals, unavailable values, unit links and complete filtered CSV remain unchanged. Open districts are retained while filters change.
