---
name: react-feature
description: Create or modify pages/features in the Direco React app following project conventions — page structure, shared UI components, API endpoint patterns, date handling, and backend pairing. Use whenever adding a new page, table, filter, or API integration to this frontend.
---

# Direco React App — Feature Conventions

React 18 + TypeScript + Vite app (`src/`). Backend is a Spring Boot API in
`D:/project/distributor/wsp/qualcy_jwt` (package `com.api.distr.docs`); most frontend
changes have a paired backend change there.

## File separation — ALWAYS split a feature into these layers

Never put everything in one page file. Each feature is split across:

| Layer | Location | Rule |
|---|---|---|
| Page | `src/pages/<Name>Page.tsx` | UI composition only — no fetch calls, no interfaces, no CSS |
| Styles | `src/styles/pages/<Name>Page.css` | One CSS file per page; import it first line: `import '../styles/pages/<Name>Page.css';` |
| Model | `src/models/<Domain>Model.ts` | All `interface` definitions for the domain (exported) |
| Service | `src/services/<domain>Service.ts` | All `fetch()` calls as exported async functions returning typed promises |
| Components | `src/components/` | Reusable pieces (used by 2+ pages) get their own file; page-local sub-components stay in the page file |

Service function pattern (see `src/services/dashboardService.ts`):
```ts
export async function getFoo(param: string): Promise<Foo[]> {
  const res = await fetch(`${ApiEndpoints.FOO}?p=${param}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch foo");
  return res.json();
}
```

## Adding a new page

1. Create the four files above (page, css, model, service).
2. Register a lazy route in `src/App.tsx`:
   - `const XPage = lazy(() => import("./pages/XPage"));`
   - Public pages go under the plain `<Route>` list; admin pages get
     `<PrivateRoute roles={["ADMIN","MANAGER"]}>`.
3. Add a nav item in `src/layout/MainLayout.tsx` inside `NAV_GROUPS`
   (sections: Operations / Reports / Admin). Icon = inline 18×18 stroke SVG.

## Shared UI components (`src/components/ui.tsx`)

Always use these instead of raw HTML:
- `PageHeader` (title, subtitle, action), `DataTable` (headers, loading, empty, emptyText),
  `TR`, `TD`, `SearchInput`, `Btn` (variants: primary/secondary/danger/ghost, size sm),
  `Card`, `Toast`, `StatusBadge`.
- **`Select` takes `<option>` children — it has NO `options` prop.**

Styling is inline `style={{}}` with CSS variables: `var(--brand)`, `var(--ink)`,
`var(--ink-60)`, `var(--ink-10)`, `var(--ink-5)`, `var(--radius-md)`.
Status badge palette: DELIVERED green (#dcfce7/#166534), PENDING amber (#fef3c7/#92400e),
FAILED red (#fee2e2/#991b1b), CLOSED blue (#dbeafe/#1e40af), ASSIGNED purple (#ede9fe/#5b21b6),
REJECTED dark red (#fee2e2/#7f1d1d).

## API endpoints

- All URLs live in `src/constants/config.ts` `ApiEndpoints` as **getters**
  (`get FOO() { return \`${getApiBaseUrl()}/...\`; }`) so the company base URL is
  resolved at call time. Parameterized ones are arrow functions.
- Fetch with plain `fetch()`; add `headers: authHeaders()` (from `services/authService`)
  for authenticated endpoints.

## Dates

- HTML `<input type="date">` uses `yyyy-MM-dd`; the API always uses `dd/MM/yyyy`.
  Convert with local helpers (`toInputVal`/`fromInputVal` or `isoToDMY`) — see
  AssignmentPage/DanReportPage for the pattern.
- Backend controllers parse dates with `DateTimeFormatter.ofPattern("dd/MM/yyyy")`
  from `@RequestParam String` — **never** `@DateTimeFormat LocalDate` (broken because
  the project avoids `@EnableWebMvc`).

## Domain: delivery_assignments.status codes

`0`=PENDING, `1`=FAILED, `2`=DELIVERED, `8`=REJECTED, `9`=ASSIGNED, `10`=CLOSED.
Reports generally exclude CLOSED (`status != 10`); the Overall Summary endpoint is
the only place CLOSED-only data is served.

## Backend pairing rules

- `delivery_assignments.delivery_boy_id` is VARCHAR; `delivery_master.delivery_id`
  is BIGINT — JOIN with `dm.delivery_id::text = da.delivery_boy_id`.
- Row-per-transaction key is `dire_id` (from `stage_sales_entery`).
- New REST endpoints follow controller → service → repository (JdbcTemplate, text SQL).
- No startup DDL — schema changes are applied manually to the DB.

## Verification

`npm run dev` (Vite, port 5173). The app is login-gated; type-check changed files with
`npx tsc --noEmit` and ignore the pre-existing TS1259/TS7031 noise present in every file.
