# CLAUDE.md
# TouchPoints Backend

## Stack
- Node.js + Express, PostgreSQL (pg with pooling), Bun
- JWT auth: 15min access token (memory), 30day refresh token (DB)
- bcrypt salt rounds: 12


## Backend
Node/Express + PostgreSQL. Modules under `backend/src/modules/<name>/`:
- `*.routes.js` — routes
- `*.controller.js` — request handling  
- `*.service.js` — business logic
- `*.model.js` — Db operations
- `*.schema.js` — Zod validation


## Folder Structure
backend/
    src
        modules/
            auth/
                auth.routes.js
                auth.controller.js
                auth.service.js
                auth.model.js
                auth.queries.js
        middleware/
        utils/
        config/

## Patterns
- asyncHandler for all async routes
- Pipeline pattern for multi-step flows
- Standardized response format: { success, data, message }
- .maybeSingle() style null safety in queries

## Current Status
- All  modules: not yet dynamic

## Do not touch
- Anything outside /backend folder