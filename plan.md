# HotelStock — Implementation Plan

Offline-first mobile inventory system (React Native/Expo) + Go/Chi backend, with a migration path toward Supabase/Postgres.

## 0. Guiding Principles

Derived from `AGENTS.md`:

- **Local-first reads/writes:** the app never talks to the network for day-to-day operations. SQLite is the single source of truth on-device.
- **Mutations are queued facts:** every mutation appends an immutable record to a local ledger, then a separate event to `sync_queue`. Syncing is replay, not re-execution of intent.
- **UUIDv4 everywhere**: collisions are impossible across devices; sync becomes idempotent upsert.
- **Zone isolation** is a hard rule enforced both in SQLite (app layer) and server (RBAC middleware).
- **The sync contract is the product:** make it robust and Postgres-compatible so the Go→Supabase migration is a swap, not a rewrite.

## 1. Decisions (Locked)

1. **Backend path.** Go backend is the *current* platform; offline-first is the product. Supabase is a **future migration only** — nothing until M7. Keep the data model and sync contract Postgres-native so the swap stays cheap.
2. **Conflict resolution.** **Last-write-wins** by `updated_at`/client timestamp, with a server-side tiebreak (row UUID) for determinism. Lives in one module so it can change.
3. **Stock model.** **Append-only ledger** (`stock_movements`) as the syncable fact; `stock_balance` as a materialized mirror for fast reads. Deductions allowed only while the running balance stays ≥ 0, enforced in the same local transaction.
4. **PowerSync.** Evaluate only at **M7**, as an optional swap for the custom sync layer.

## 2. Design Language — "a beautiful weather app"

The app should *feel* like a premium weather app: calm, glassy, atmospheric; stock levels presented like forecasts, not spreadsheets.

**Visual principles**
- **Glassmorphism menus:** translucent panels with `backdrop-blur` (`expo-blur`), subtle light borders (`border-white/20`), soft layered shadows. Modals, zone switcher, stock-action sheets are frosted glass, never solid blocks.
- **Atmospheric backgrounds instead of flat white:** each zone gets a **lively image/drawing** as a full-bleed hero —
  - *Restaurant:* warm candle-lit dining scene /
  - *Patio:* golden-hour sky, string lights
  - *Technical:* moody workshop / steel-blue tools illustration
  - *Main Storage:* spacious receiving dock, morning light
  - Style suggestion: painterly subtle-animated illustrations (SVG) > stock photos; photos fallback.
- **Typography:** large, light/medium weights for hero numbers, tight tracking; balances read like temperatures (e.g., `0.7` → big number + unit).
- **Motion:** smooth, slow-feeling transitions (`react-native-reanimated`); gentle gradient shimmer on the hero; press feedback on glass.
- **Palette:** per-zone sky palettes on a dark or soft base (amber dusk for patio, deep slate for technical); accents used sparingly for low-stock warnings (not full-screen red).

**Component inventory (rn-primitives + NativeWind, shadcn-shaped)**
- `GlassCard` (blur + `bg-white/10` + hairline border), `GlassSheet` (action dialogs), `GlassNav` (transparent tab bar over content)
- Hero `ZoneHeader` (background art + zone name + big balance number), `StockBadge` (in/out chips), `SyncPill` (pulsing live/queued/offline indicator)
- Low-stock states as glass cards with weather-like icons (e.g., "low supply" as a drizzle icon, "out" as storm) — keeps the tone lively, not alarming.

**Deps added in M5:** `expo-blur`, `expo-linear-gradient`, `react-native-reanimated`, `react-native-svg`, `lucide-react-native`, `nativewind`.

## 3. Data Model (Postgres-compatible schema)

All tables use `id UUID PRIMARY KEY`, snake_case columns, `created_at`/`updated_at` timestamps, tombstones (`deleted_at`) instead of hard deletes.

**`zones`** — seed data (restaurant, patio, technical, main_storage).
`id, code (unique), name, created_at, updated_at`

**`users`** — DB/GM-provisioned only. `id, email (unique), encrypted_password (bcrypt), role, zone_access (JSONB array of zone codes), created_at, updated_at`

**`items`** — shared catalog. `id, name, sku (unique, nullable), unit (pcs/kg/L…), category, created_at, updated_at, deleted_at`

**`stock_movements`** — immutable ledger (the syncable fact):
`id, movement_type (in|out|transfer|adjust), item_id, from_zone_id, to_zone_id, quantity, created_by (user id), created_at, updated_at, deleted_at`

- Transfer = `from_zone_id` + `to_zone_id`; in/out use `to_zone_id`/`from_zone_id` respectively. This maps cleanly to idempotent upserts.

**`stock_balance`** — materialized running quantity per (item, zone):
`item_id, zone_id, quantity, updated_at` — composite PK, updated transactionally with each movement.

**`rooms`** — hotel rooms, a top-level entity (not a zone). Staff-managed now, PMS import later.
`id, number (unique), floor, type, capacity, created_at, updated_at, deleted_at`

**`guests`** — residents and outside diners. `source`/`pms_ref` future-proof for PMS import.
`id, name, phone (nullable), source (manual|pms), pms_ref (nullable), created_at, updated_at, deleted_at`

**`room_stays`** — immutable log of who stayed in which room when (the syncable fact; check-in/out).
`id, room_id, guest_id, check_in, check_out (nullable), status (active|checked_out), created_by, created_at, updated_at, deleted_at`

**`meal_reservations`** — breakfast (and other meal) bookings, resident or outside guest.
`id, meal (breakfast|lunch|dinner), at_date (date), guest_id (nullable), room_id (nullable), party_size, status (booked|confirmed|cancelled), notes, created_by, created_at, updated_at, deleted_at`

**`shops`** — searchable supplier/shop directory.
`id, name, contact (nullable), address (nullable), notes, created_at, updated_at, deleted_at`

**`shop_items`** — which shops carry which items; the search join for "where can I buy X?".
`shop_id, item_id` (composite PK)

**`shopping_list_items`** — manual procurement list (no auto low-stock logic).
`id, item_id, shop_id (nullable), quantity, note, status (open|bought|cancelled), created_by, created_at, updated_at, deleted_at`

**`sync_queue`** (mobile-only):
`id (uuid), entity (table name), entity_id (uuid), operation (upsert|delete), payload (JSON), created_at, attempts, last_error, synced_at`

**`sync_state`** (mobile-only): pull watermarks per table + last push attempt.
`table_name (PK), last_pulled_at, last_push_at`

**Migration aids:** `zone_access` and `payload` as JSONB; `ON CONFLICT` upserts; no Go-specific types in the schema.

## 4. Sync Contract

### Push (device → server)
- `POST /api/v1/sync/push` accepts a **batched array** of `sync_queue` rows (`[{entity, entity_id, operation, payload}]`).
- Server applies them **in order, in a single transaction**, as idempotent upserts (`INSERT … ON CONFLICT (id) DO UPDATE`); `delete` operations write tombstones (or hard-delete rows that are append-only).
- Returns per-item results `[{entity_id, ok, error}]`; the client marks each as `synced_at` (or backfills `attempts`/`last_error` on failure).
- On partial batch failure the whole batch rolls back — no half-applied movements.

### Pull (server → device)
- `POST /api/v1/sync/pull` with `{since: {table: watermark}}` from `sync_state`.
- Server returns, per table, rows where `updated_at > watermark` (incl. tombstones).
- Client applies them as the same idempotent upserts, then advances the watermark for that table.

### Rules that make it work
- **Idempotency:** every op is keyed by UUID; retries are safe by construction.
- **Ordering:** queue is FIFO per device; pushes preserve causal order within a batch.
- **Conflicts:** `stock_movements` are append-only facts → no conflicts. For `items` (rare edits), LWW by `updated_at`, server-side UUID tiebreak.
- **Negative stock:** rejected at *validation* time on the server too (defense-in-depth) — and at the client in the local transaction.
- **Hospitality tables** (`guests`, `room_stays`, `meal_reservations`) ride the same queue + pull-watermark machinery. `source=pms` rows merge idempotently later; the pull feed carries arrivals/reservations made on other devices.

## 5. Backend (Go + Chi)

Current: bare `main.go` with `/health` + CORs. Target structure:

```
backend/
  cmd/server/main.go        # wiring, graceful shutdown
  internal/auth/             # login, JWT issue/refresh, bcrypt
  internal/middleware/       # jwtauth verifier + EnforceZone (403 on mismatch)
  internal/zones/            # zones handlers
  internal/items/            # items handlers
  internal/sync/             # push/pull handlers + conflict rules
  internal/users/            # GM-only provisioning endpoint
  internal/store/            # DB access (Postgres-compatible SQL, pgx later)
  migrations/                # SQL migrations (Postgres-native SQL from day 1)
```

Routes:
- `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`
- `POST /api/v1/users` (GM role only)
- `GET /api/v1/zones`, `/api/v1/items` (JWT-protected, filtered by `zone_access`)
- `POST /api/v1/sync/push`, `/api/v1/sync/pull`
- Hospitality:
  - `GET /api/v1/rooms?by_number=` / `GET /api/v1/rooms/{id}/stays` — residents by room
  - `POST /api/v1/rooms/{id}/checkin`, `POST /api/v1/rooms/{id}/checkout`
  - `GET /api/v1/meal-reservations?at_date=&meal=`, `POST /api/v1/meal-reservations`, `PATCH /api/v1/meal-reservations/{id}` (incl. cancel)
  - `GET /api/v1/dining/forecast?at_date=` — headcount by meal (resident vs outside) for kitchen prep
  - `GET /api/v1/shops?q=` / `POST /api/v1/shops` / `PATCH /api/v1/shops/{id}`, `GET /api/v1/shops/{id}/items`
  - `GET /api/v1/shopping-list` / `POST /api/v1/shopping-list` / `PATCH /api/v1/shopping-list/{id}` (assign shop, qty, mark bought/cancelled)

Notes:
- **Reference material:** two cloned MIT-licensed Go inventory projects to mine for structure (do NOT copy code — neither has offline/sync/zones, and both use Echo/Fiber, not Chi):
  - `reference/` (erkindilekci/inventory-management-system): Go + Postgres + Echo, layered controller→service→repo. Mine `server/pkg/domain/models` and the **JWT login flow** (`pkg/controller/user_controller.go`, `pkg/middleware/auth.go`).
  - `reference-gorm/` (tanasinp/go-inventory-management): Go + Postgres + Fiber + GORM, **hexagonal** layout. Mine `core/` for the **categories + suppliers** domain shape (basis for the `items` catalog) and borrow the hexagonal idea for `internal/`.
- DB first target can be in-memory/embedded SQLite (per testing rules) with SQL kept Postgres-compatible; swap to `pgx` for Supabase.
- `EnforceZone(zone)`: decode JWT claims, reject without matching `zone_access` → `403`.
- `Go tests` per `AGENTS.md`: targeted regex `-run`, in-memory SQLite, no broad suites.

## 6. Mobile (Expo / React Native)

Current: blank TypeScript template + `src/api.ts` health/hello call.

Target structure:

```
mobile/
  src/
    db/            # expo-sqlite init, migrations, schema
    repos/         # items, movements, queue — SQLite-first, no network in business logic
    sync/          # queue append + background flush, pull loop, NetInfo gating
    auth/          # secure-store JWT cache + local decode, zone-gated rendering
    ui/            # rn-primitives + NativeWind components (shadcn style)
    screens/       # Login, ZoneHome, Inventory, StockMovements, SyncStatus, Rooms, Dining
```

- Deps to add: `expo-sqlite`, `expo-secure-store`, `@react-native-community/netinfo` (or `expo-network`), `@rn-primitives/*`, `nativewind`.
- Mutations flow: **UI → repo (SQLite txn: insert movement + update balance + append queue) → background sync manager → push/pull**.
- Sync manager: flush queue when connectivity returns; pull new watermark every sync; single serialized worker to avoid interleaving.
- Offline auth: decode cached JWT locally; hide/edit-disable screens the user's `zone_access` doesn't cover; sanitize `zone_access` before queueing to a different zone.
- Hospitality flows reuse the same offline pattern: room check-in/out and meal reservations are local SQLite mutations → `sync_queue`. Displays (residents by room number, dining forecast) read local DB only.
- Procurement flows reuse the same pattern: shopping-list entries and shop directory edits are local SQLite mutations → `sync_queue`; list/search read local DB only (manual list, no auto low-stock).
- Design keeps the weather-app tone: room cards as forecast tiles (e.g., "204 — 2 guests, breakfast×2"), dining forecast in a soft dawn gradient, per-zone pastel accents. Shopping list reads as a glass checklist — open items bold, bought items faded like a cleared-sky tick, shops searchable via a frosted search field.

## 7. Milestones (in order)

1. **M1 — Foundations (done).** Expo + Go scaffolding verified.
2. **M2 — Schema & local DB.** SQLite schema + migrations; zones + items seeded; repos with SQLite-first CRUD; ledger + balance invariants (negative-stock guard).
3. **M3 — Go data + auth.** Zod schema → migrations; auth login/JWT/RBAC; zones/items endpoints against in-memory SQLite; targeted tests.
4. **M4 — Sync.** Go push/pull handlers (batch, ordered, transactional, idempotent); mobile queue insert/extract; NetInfo-gated flush; isolated sync tests (mock network).
5. **M5 — Design + UI.** Set up NativeWind, rn-primitives, expo-blur/reanimated (per §2); glass component kit; Login, ZoneHome/inventory list, in/out/transfer dialogs, sync status; offline permission gating.
6. **M6 — Hardening.** Conflict module reconciliation, tombstone propagation, JWT refresh, `sync_queue` retry/backoff, multi-device manual test.
7. **M7 — Supabase (future only).** Re-evaluate PowerSync vs custom sync; if custom stays, swap store layer to `pgx` (schema already compatible).
8. **M8 — Rooms & Dining module.** `rooms`/`guests`/`room_stays`/`meal_reservations` tables + repos; resident lookup by room number; meal reservations + dining forecast endpoints; Rooms + Dining screens with weather-style cards.
9. **M9 — Shopping & Shops module.** `shops`/`shop_items`/`shopping_list_items` tables + repos; manual shopping list (assign shop, mark bought); shop search (`?q=` + per-item carry lookup); Shopping List + Shops screens.
10. **M10 — Live stock insights.** Movement history feed (per-item timeline with who/when), 7/30-day stock-trend sparklines drawn from the ledger (weather-app forecast look), and barcode/QR scanning (`expo-camera`) for fast in/out/transfer.
11. **M11 — Goods receipt workflow.** Receive a bulk order once at Main Storage and auto-distribute to zones; movement `reason` free-text; 1-tap quick-actions for most-touched items; compensating undo (adjustment writes, never row deletion).

## 8. Testing Strategy (per AGENTS.md)

- **Go:** targeted `go test -run ^TestX$` with in-memory SQLite (`modernc.org/sqlite`). Cover `push` ordering/rollback, idempotency (double-push), conflict tiebreak, `EnforceZone` 403s.
- **Mobile:** `npx jest <specific-file>`. Mock network fully. Test `sync_queue` insert → extract; ledger negative-stock guard; watermark advance.
- No global suites, no E2E network tests unless explicitly commanded.

## 9. Risks

- **Custom sync drift:** hand-rolled sync is the riskiest component; keep it small, deterministic, and swap-able (PowerSync) — that's why the contract is isolated in one module.
- **LWW for catalog edits** may silently drop one hotelier's change; acceptable for internal tool, revisit if item records become heavily edited.
- **Clock skew** between devices affects LWW ordering; using client timestamps with server tiebreak bounds the damage.
- **Token-stamped `zone_access`** means permission changes wait for expiry → short access tokens + refresh.

## 10. Future Candidates (Stretch)

Not scheduled; revisit after M10.

**Product**
- **Stocktakes:** periodic counting writes `adjust` movements to reconcile the ledger against physical reality ("found 6, expected 5").
- **Low-stock thresholds + watch list:** manual per-item level, surfaced as a highlighted pill / "needs attention" filter — never auto-reorder (keeps the shopping list manual).
- **Unit-of-measure conversions:** e.g. stock in kg but bought in boxes — a tiny unit-ratio layer to avoid silent math errors.
- **Expiry/use-by on perishables** (restaurant/bar) with an "expiring soon" view + FIFO hint.
- **Breakfast → ingredient consumption:** map dishes→ingredients so the dining forecast yields a real perishables estimate.
- **Seasonal patio mode:** toggle to surface/hide weather-dependent patio stock (matches the weather-app design).
- **Audit export for GM:** backend CSV/Excel of stock + movements for management reporting.
- **Goods receipt at Main Storage:** receive a bulk order once, auto-distribute to zones (highest-frequency hotel workflow — see M11).
- **Movement reason + quick-actions:** free-text "why" stored on the ledger; pin most-touched items as 1-tap deduct buttons (see M11).
- **Compensating undo:** accidental movements write a compensating adjustment, never delete fact rows (see M11).

**Hygiene**
- **Seed roles** beyond GM (`kitchen`, `bartender`, `housekeeping`) so `role` isn't an unconstrained string.
- **Index + paginate movements** — they grow fastest; add indexes and cursor/offset pagination on reads.
- **Sync conflict reports:** surface "merged N clashes" to a GM view instead of silent last-write-wins.
- **Design tokens as code:** palette/glass/typography in one typed NativeWind theme file so the weather look stays consistent.
- **Component gallery screen:** a hidden "kit" page showing every glass component for quick QA.
- **i18n** via `i18next` early — hotel staff are often multilingual; cheap now, painful later.

## 11. Operating Notes (applies from the start)

These aren't milestone features — they're how the system is built and run day to day.

- **Version control:** repo lives at `github.com/maximdm/hotel-stock`; `reference/` and `reference-gorm/` are git-ignored (external clones, not subtree-code).
- **Device schema migrations:** run expo-sqlite migrations via `PRAGMA user_version` + a tiny migration runner — devices in the field must upgrade in place, never wipe.
- **SQLite hygiene:** WAL mode + integrity check on startup; move faster-growing tables (movements, queue) with indexes from day one.
- **sync_queue retention:** purge acknowledged rows after a short retention window so the DB doesn't grow forever.
- **Auth/session:** refresh tokens only when online; show a calm "session expired — re-login when you have signal" state; keep access tokens short since `zone_access` is stamped.
- **Timezone:** store timestamps as UTC, render local; `at_date` is a hotel-local date — keep the boundary explicit.
- **Environment/secrets:** TLS in prod; no secrets in code; explicit dev/prod API base URL beyond the auto-IP dev logic.
- **Design governance:** palette/glass/typography tokens as a typed theme file; hidden glass-component gallery screen; `i18next` wired early.