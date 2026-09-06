# Coding Agent Context: Hotel & Restaurant Inventory System

## Project Overview
You are assisting in building an offline-first mobile application (React Native) with a backend API (Go + Chi) for managing hotel and restaurant inventory. The system must operate seamlessly in network deadzones (basements, outdoor patios, thick-walled storerooms) and synchronize data when connectivity is restored.

## Tech Stack Requirements
*   **Mobile Frontend:** React Native (Expo).
*   **UI Framework:** `rn-primitives` paired with NativeWind to achieve a `shadcn/ui` aesthetic on mobile.
*   **Local Persistence:** Local SQLite on the mobile device (critical for offline capability).
*   **Backend:** Go utilizing the `chi` router.
*   **Remote Persistence:** Currently syncing to a central DB, designed for a seamless migration to **Supabase** (PostgreSQL) in the future.

## Core Architectural Rules (Strict Adherence)

1.  **Offline-First & Sync Queueing:** 
    *   All read/write operations on the mobile app must hit the **local SQLite database first**.
    *   Mutations (stock deductions, transfers, additions) must be appended to a local `sync_queue` table.
    *   Implement a background sync manager that attempts to push the `sync_queue` to the Go backend when network connectivity is detected.
2.  **UUIDs for Primary Keys:** 
    *   Because records will be created offline, NEVER use auto-incrementing integers for IDs. Use UUIDv4 for all primary keys to prevent collisions when syncing with the future Supabase backend.
3.  **UI Component Rules:** 
    *   Do not use raw React Native components for complex interactions. Rely exclusively on `@rn-primitives` (e.g., dialogs, selects, tabs) and style them with NativeWind classes (`className`).
4.  **Backend Routing:** 
    *   Group Go Chi routes by domain (`/api/v1/zones/...`, `/api/v1/sync/...`).
    *   Ensure the backend can handle bulk array payloads gracefully to process batched sync requests from devices returning to network coverage.

## Authentication & Authorization

1.  **Database-Level Account Creation:**
    *   No public sign-ups. Accounts are strictly provisioned directly via DB seeding or an internal General Manager endpoint.
    *   **`users` table schema:** `id` (UUIDv4), `email` (Unique string), `encrypted_password` (bcrypt hash), `role` (String), `zone_access` (JSON or Text Array), `created_at`, `updated_at`.
2.  **Go Backend (JWT & Chi):**
    *   Implement `/api/v1/auth/login` to verify bcrypt passwords and issue a signed JWT containing `id`, `role`, and `zone_access`.
    *   Use `github.com/go-chi/jwtauth/v5` for protecting domain routes.
    *   Create custom RBAC middleware (e.g., `EnforceZone(zone)`) that decodes the JWT context and immediately rejects unauthorized requests (`403 Forbidden`).
3.  **Offline Authentication (Mobile):**
    *   Cache the JWT securely using `expo-secure-store`.
    *   When offline, decode the JWT payload locally on the client. Use the cached `role` and `zone_access` to dynamically render/hide UI elements and prevent unauthorized local SQLite mutations.

## Testing Protocol & Environment Restrictions (CRITICAL)

To conserve context window and execution time, **DO NOT run global or broad test suites** (e.g., `go test ./...`, `npm test`, or `npx jest`) after making file changes. 

1.  **Targeted Execution Only:** You may only run tests for the exact function or component you just created or modified. 
    *   *Go:* Use isolated regex flags (e.g., `go test -v -run ^TestProcessSyncQueue$ ./internal/sync`).
    *   *React Native:* Target the specific test file (e.g., `npx jest components/ZoneSwitcher.test.tsx`).
2.  **In-Memory DB for Go Tests:** When testing Go backend logic that interacts with the database, spin up an in-memory SQLite instance (using standard drivers like `modernc.org/sqlite`) instead of mocking the database interfaces or hitting a live instance.
3.  **Isolated Sync Testing:** When testing the React Native offline sync logic, mock the network layer completely. Do not attempt to run end-to-end (E2E) network tests unless explicitly commanded. Test the `sync_queue` insertion and extraction in isolation using the local SQLite layer.
4.  **No Speculative Fixes:** If a targeted test fails, do not attempt to fix unrelated tests that may have broken in other files. Inform the user of the targeted failure and resolve it locally.

## Domain Logic & Zones

The inventory is partitioned into isolated, strict zones. Items belong to zones, and stock movements can happen within or across zones.

*   **Restaurant:** High-turnover perishables, bar inventory, tableware, linens.
*   **Patio:** Weather-dependent stock, outdoor furniture cushions, seasonal bar supplies.
*   **Technical:** Maintenance tools, hardware, electrical spares, heavy cleaning agents (often located in network deadzones).
*   **Main Storage:** The central receiving hub where bulk orders land before zone distribution.

## Hospitality Operations: Rooms & Dining

Beyond zone inventory, the app tracks who is staying in the hotel and who expects to eat, so staff can answer "what's room 204's situation?" and the kitchen can prep from a breakfast headcount.

1.  **Rooms & Residents:** Rooms are a top-level entity (not a stock zone). Residents/guests can be entered manually on-device (offline, synced like everything else). The schema must leave room for a future PMS import — use `source` (`manual|pms`) and `pms_ref` columns.
2.  **Resident lookup by room number:** Staff can pull up a room by its number and see its current residents (active `room_stays`).
3.  **Meal reservations:** Individual bookings for breakfast and other meals — a booked resident *or* an outside/non-hotel guest — tracked by date/meal, with cancelling.
4.  **Dining forecast (kitchen prep):** An aggregate of expected headcount per date/meal (residents + outside guests) that the kitchen uses to forecast food consumption; tie this into restaurant perishable stock forecasting.

## Procurement: Shops & Shopping List

Staff keep a running shopping list for replenishing stock and a searchable directory of shops/suppliers. Both are offline-first like the rest of the app.

1.  **Shopping list:** A manually maintained list of items to buy (no automatic low-stock logic). Each entry holds the item, quantity, an optional assigned shop, and an `open|bought|cancelled` status.
2.  **Shops directory:** A searchable catalog of shops/suppliers (name, contact, address) and which items they carry, so staff can find where to buy something.
3.  **Assignment:** A shopping-list entry can point at a shop from the directory; bought entries stay on the list for reference.