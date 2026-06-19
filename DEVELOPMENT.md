# Development Guide

Internal guide for developers working on this codebase — local setup, environment, the transform chain, and known gotchas.

---

## Prerequisites

- Node.js v18 or higher
- Access to an EGO application credential with permission to update analyses in SONG
- Access to dev SONG and dev EGO endpoints

---

## Environment variables

| Variable | Example | Notes |
|---|---|---|
| `SONG_HOST` | `https://song-clinical.dev.virusseq-dataportal.ca` | Use prod URL only when confident |
| `SONG_ENV` | `dev` | Informational label included in logs |
| `SONG_PAGE_SIZE` | `100` | Analyses fetched per page per study |
| `SONG_CONCURRENT_REQUESTS` | `5` | Max PATCH requests in flight at once |
| `EGO_HOST` | `https://ego.dev.virusseq-dataportal.ca/api` | The `/api` path segment is required |
| `EGO_CLIENT_ID` / `EGO_CLIENT_SECRET` | see team vault | Can also be loaded from Vault (see below) |
| `VAULT_ENABLED` | `false` | Set to `true` to load credentials from Vault |
| `VAULT_SECRETS_PATH` | `secret/path/to/credentials` | Required when `VAULT_ENABLED=true` |

Create a `.env` file at the repo root (not committed):

```bash
SONG_HOST=https://song-clinical.dev.virusseq-dataportal.ca
EGO_HOST=https://ego.dev.virusseq-dataportal.ca/api
EGO_CLIENT_ID=...
EGO_CLIENT_SECRET=...
```

---

## Running locally

```bash
npm install
npm run build      # compile src/ → dist/
node dist/index.js # run the migration
```

For development against live SONG without building, use `ts-node` if available, or use the compiled output after `npm run build`.

---

## How the migration works

### Transform chain

Transforms are chained steps, each responsible for migrating `consensus_sequence` from version N to N+1. They live in [`src/migration/transforms/consensus_sequence/`](src/migration/transforms/consensus_sequence/):

```
02_to_03.ts  →  03_to_04.ts  →  ...  →  21_to_22.ts
```

The chain is assembled in [`index.ts`](src/migration/transforms/consensus_sequence/index.ts). Each analysis enters the chain at its current version and exits at the highest version the chain supports (capped by what SONG has registered — see below).

Each transform file:
- Defines a Zod `InputSchema` validating that the analysis is at the expected version
- Applies field changes and returns a deep clone at the next version
- Exports via `defineTransform({ start, end }, transform)`

### Adding a new transform

1. Create `src/migration/transforms/consensus_sequence/NN_to_MM.ts` following the pattern of an existing file
2. Add it to the chain in `src/migration/transforms/consensus_sequence/index.ts` as the last argument to `createTransformChain(...)`
3. Bump the version constant in `src/migration/transforms/consensus_sequence/constants.ts` if one exists

### Chain capping

At startup, the script queries SONG's `/schemas` endpoint once to find the highest registered `consensus_sequence` version. The active chain is then capped at that version with `chain.to(...)`. This prevents the script from attempting to migrate analyses to a schema version that SONG has not yet registered.

**Dev SONG** only has schemas v2–v5 registered. The chain will cap at v5 when running against dev.
**Prod SONG** has schemas v4–v22 registered. The chain runs its full length.

To inspect what versions SONG has registered:

```bash
curl "https://song-clinical.dev.virusseq-dataportal.ca/schemas?name=consensus_sequence&hideSnapshot=true" | jq '.resultSet[].version'
```

### Skipping analyses

Analyses are skipped (not migrated, not patched) when their current version is outside the active chain's bounds:
- Below the chain start: already up-to-date for this run (or at a version the chain doesn't handle)
- At or above the chain end: already at the target version

Skipped counts appear in the per-study summary log.

---

## Dev vs prod SONG differences

| | Dev | Prod |
|---|---|---|
| Domain | `song-clinical.dev.virusseq-dataportal.ca` | `song-clinical.imicroseq-dataportal.ca` |
| Registered schemas | v2–v5 | v4–v22 |
| Studies | `RRPL-SK`, `UHTC-ON` (small) | All active studies |

Always confirm the target environment before running. The `SONG_ENV` label in the logs identifies which environment the script is connected to.

---

## Working documents

The `.dev/` directory is the shared context layer for this project:

- [`.dev/tech-debt.md`](.dev/tech-debt.md) — known issues; `standalone: yes` items can be picked up independently
