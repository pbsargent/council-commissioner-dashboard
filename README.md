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
