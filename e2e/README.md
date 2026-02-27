# E2E Tests — Playwright

End-to-end tests for the product-template using [Playwright](https://playwright.dev/).

## Structure

```
e2e/
  @system/           # Core template tests (do not modify)
    01-public-pages.spec.ts   — Public marketing/legal pages load correctly
    02-auth.spec.ts           — Auth page, registration, password reset, guards
    03-navigation.spec.ts     — Client-side routing, redirects, 404 handling
    04-accessibility.spec.ts  — Basic a11y checks (titles, headings, alt text)
  @custom/           # Product-specific tests (add your tests here)
  fixtures/
    index.ts         — Shared fixtures, helpers, and test user credentials
```

## Running Tests

```bash
# From the product-template root:

# Run all E2E tests (headless, Chromium only by default)
npm run test:e2e

# Run with browser UI (interactive)
npm run test:e2e:ui

# Run headed (visible browser)
npm run test:e2e:headed

# View last report
npm run test:e2e:report
```

## Configuration

See `playwright.config.ts` at the repo root. Key settings:

- **baseURL**: `http://localhost:5173` (or set `BASE_URL` env var)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome
- **Retries**: 2 on CI, 0 locally
- **Artifacts**: screenshots + traces on failure, report in `playwright-report/`

## Adding Custom Tests

Create files in `e2e/@custom/` — they are automatically picked up.

```ts
// e2e/@custom/my-feature.spec.ts
import { test, expect } from '@playwright/test'

test('my feature works', async ({ page }) => {
  await page.goto('/my-route')
  await expect(page.locator('h1')).toContainText('My Feature')
})
```

## CI

Set these env vars in your CI pipeline:

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:5173` | Frontend URL |
| `TEST_USER_EMAIL` | `test@example.com` | E2E test user email |
| `TEST_USER_PASSWORD` | `TestPassword1` | E2E test user password |
| `CI` | — | Set to `true` to enable CI mode (retries, stricter checks) |
