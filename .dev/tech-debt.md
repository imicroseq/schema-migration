# Tech Debt

## Active

_(none blocking)_

---

## Low Priority

### No tests
No unit or integration tests exist. The transform functions (`02_to_03.ts` through `21_to_22.ts`) and the `filterSkippedAnalyses` logic in `migrateAndUpdateStudy.ts` are the highest-value targets for initial coverage. Each transform has clear inputs and outputs, making them straightforward to test in isolation.
standalone: yes

### Request timeouts are hardcoded
`withTimeout(10000, ...)` for schema queries and `withTimeout(5000, ...)` for PATCH requests are constants in the code. They should be configurable via environment variables (`SONG_SCHEMA_TIMEOUT_MS`, `SONG_UPDATE_TIMEOUT_MS`) for easier tuning in slow environments.
standalone: yes

### `getAnalysesPage` structured metadata swallowed in dev logging
`song/index.ts` calls `logger.info('Fetching analyses from Song', { filters, page })`. The Winston `printf` format used in dev only reads `info.message` — the second argument (the object) is silently dropped. All structured metadata needs to be serialized into the message string to appear in dev logs. Production JSON format is unaffected.
standalone: yes

### Fallback to full chain on version-query failure is risky
When SONG's `/schemas` endpoint is unreachable, the script logs a warning and continues with the full transform chain. A full chain in dev will attempt to migrate analyses beyond v5 and fail with `analysis.type.not.found` 404s. Aborting on version-query failure would be safer than the silent fallback.
standalone: yes

~~### `AnalysisFilters` unused import in `index.ts`~~ — removed 2026-06-19
