# Implementation Plan: Optimize Web Navigation and Job Details Performance

Investigate and fix performance bottlenecks when navigating menus and opening job detail / sub-tasks across the OKSIGN Dashboard.

## Proposed Changes

### 1. Optimize `getCurrentProfile` with React `cache()`

#### [MODIFY] [current-profile.ts](file:///e:/OKSIGN-Dashboard/lib/current-profile.ts)
- Wrap `getCurrentProfile` with React's built-in `cache()` function so multiple calls within the same request lifecycle (e.g. layout, page, nested components) execute the Supabase Auth & Profile lookup only once.
- Streamline notification count fetching so it does not block unneeded execution.

---

### 2. Parallelize Queries & Eliminate Waterfall in Job Details

#### [MODIFY] [app/jobs/[id]/page.tsx](file:///e:/OKSIGN-Dashboard/app/jobs/%5Bid%5D/page.tsx)
- Join `assigned_graphic:profiles!assigned_graphic_id(full_name)` directly into the primary `jobs` select query instead of performing a secondary sequential DB lookup.
- Fetch `job_design_proofs` concurrently within the main `Promise.all` instead of awaiting sequential execution.
- Utilize activity log data from the initial query for any fallback proof requirements rather than making duplicate database round-trips.

---

### 3. Parallelize Data Fetching on Job List & Operational Pages

#### [MODIFY] [app/jobs/page.tsx](file:///e:/OKSIGN-Dashboard/app/jobs/page.tsx)
- Execute `allProfiles`, statistics count queries, and the `mainJobsQuery` concurrently in `Promise.all` instead of running them sequentially.

---

### 4. Provide Instant Navigation Feedback with `loading.tsx`

#### [NEW] [app/loading.tsx](file:///e:/OKSIGN-Dashboard/app/loading.tsx)
- Create a lightweight global loading skeleton that conforms strictly to the UI guidelines (no raw emojis, vector Lucide icons, smooth skeleton pulse).

#### [NEW] [app/jobs/loading.tsx](file:///e:/OKSIGN-Dashboard/app/jobs/loading.tsx)
- Create a dedicated loading skeleton for job lists and operations page to show instant table skeletons upon clicking navigation links.

#### [NEW] [app/jobs/[id]/loading.tsx](file:///e:/OKSIGN-Dashboard/app/jobs/%5Bid%5D/loading.tsx)
- Create a dedicated split-workbench loading skeleton for viewing job details so the page responds instantaneously to clicks.

---

## User Review Required

> [!NOTE]
> All changes are purely performance and data fetching optimizations. No database schema, business logic, role permissions, or user flows are altered.

## Verification Plan

### Automated Tests / Lint
- Run `npm run lint` or `npx eslint .` to ensure zero syntax or lint errors.
- Run build check (`npx vinext build` or TypeScript check `npx tsc --noEmit`) to verify type safety.

### Manual Verification
- Test menu navigation between แดชบอร์ด, รายการงาน, งานออกแบบ, ลูกค้า, and verify instant loading feedback.
- Test clicking into job details (`/jobs/[id]`) and verify fast loading with correct proofs, specs, stepper status, and finance info.
