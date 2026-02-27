# Nestora Custom Features Migration Plan

Generated: 2026-02-26 22:55  
Status: Analysis complete, ready for implementation

## Overview
This document maps all custom features from legacy Nestora to the new product-template-based structure.  
ALL custom code MUST go in `@custom/` directories only. NEVER modify `@system/` files.

---

## Backend Custom Features

### Database Repositories (@custom/repos)
Legacy location: `legacy/nestora/server/src/db/repos/@custom/`

**Required repos:**
1. **BrandRepo.js** - Brand management (core feature)
2. **UserRepo.js** - Extended user functionality beyond auth
3. **ErrorEventRepo.js** - Error tracking persistence
4. **CollaboratorRepo.js** - Team collaboration features
5. **ApiKeyRepo.js** - API key generation and management

### Database Migrations (@custom/migrations)
Legacy location: `legacy/nestora/server/src/db/migrations/@custom/`

**Required migrations (in order):**
1. `001_error_events.js` - Error tracking table
2. `002_brands.js` - Brand management
3. `002_collaborators.js` - Team collaboration
4. `002_users_custom.js` - User extensions
5. `003_api_keys.js` - API key storage
6. `003_invitation_tokens.js` - Invite system
7. `003_full_text_search.js` - Search optimization

### Configuration
- `server/src/config/@custom/index.js` - Product-specific config
- `server/src/scheduler/tasks/@custom/index.js` - Scheduled jobs
- `server/src/lib/@custom/index.js` - Custom utilities

---

## Frontend Custom Features

### Pages (@custom/pages)
Legacy location: `legacy/nestora/client/src/app/pages/app/@custom/`

**Required pages:**
1. **ErrorTrackingPage.tsx** - Main error dashboard
2. **NestoraDashboardPage.tsx** - Product-specific dashboard

### Integrations
- **Sentry** (`app/lib/@custom/sentry.ts`) - Error monitoring integration

### Routes
- `app/routes/@custom/index.tsx` - Custom route definitions

### Configuration
- `config/@custom/info.ts` - Product metadata and branding

---

## Implementation Priority

### Phase 1: Core Data Model (P0)
- [ ] Migrate all database migrations to new structure
- [ ] Implement all @custom repos
- [ ] Test database initialization

### Phase 2: Backend Logic (P1)
- [ ] Custom config and utilities
- [ ] Scheduler tasks (if any)
- [ ] API endpoint extensions

### Phase 3: Frontend (P1)
- [ ] ErrorTrackingPage
- [ ] NestoraDashboardPage
- [ ] Custom routes
- [ ] Sentry integration

### Phase 4: Testing (P2)
- [ ] Unit tests for repos
- [ ] API integration tests
- [ ] E2E tests for custom pages

---

## Acceptance Criteria
1. All custom features work exactly as in legacy version
2. Zero modifications to @system files
3. All tests pass
4. Dev server runs without errors
5. Database migrations execute cleanly

---

## Notes
- Legacy code location: `/Users/ruipedro/.openclaw/workspace-assimetria/legacy/nestora/`
- New structure: `/Users/ruipedro/.openclaw/workspace-assimetria/nestora/`
- Reference legacy files directly when implementing
- DO NOT copy-paste blindly - adapt to new template structure
