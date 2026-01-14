# Repository Guidelines

## Project Structure & Module Organization
The Next.js app lives under `pages/` for route entrypoints, with shared UI composed from `components/` (grouped into `Landing`, `Portal`, `Admin`, and `Layout`). Firebase helpers and integration logic reside in `lib/`, while mock datasets and fixtures sit under `data/`. Styles are split between global files in `styles/` and component-scoped CSS modules when needed. Environment examples live in `.env.example`; copy to `.env` before running.

## Build, Test, and Development Commands
- `npm run dev` launches the Next.js dev server at `http://localhost:3000`.
- `npm run build` compiles the production bundle; run it before opening a PR.
- `npm run start` serves the built app locally for smoke testing.
- `npm run lint` runs ESLint with the Next.js Core Web Vitals rules.

## Coding Style & Naming Conventions
Use TypeScript with strict mode enabled and favor functional React components. Component files and directories use PascalCase (see `components/Portal/MaintenanceRequestForm.tsx`), while helpers and data files stay camelCase. Indent with two spaces; keep multi-line JSX props on separate lines. Prefer path aliases via `@/` instead of deep relative imports. ESLint surfaces most violations; resolve lint feedback before committing.

## Authentication & Role Setup
Firebase Authentication backs the login flow. After creating a user, add a Firestore document at `users/{uid}` with `role: "tenant" | "admin"`, plus optional `displayName`, `email`, `propertyIds`, and `managedProperties`. Missing docs default to the tenant role, but admins must be flagged explicitly. Update `scripts/seed-roles.js` with your Firebase Authentication UIDs, then run `node scripts/seed-roles.js <path-to-serviceAccountKey.json>` to batch seed roles for local development.

## Testing Guidelines
Automated tests are not configured yet. Until a Jest/React Testing Library stack lands, cover features with `npm run lint`, manual flows in `npm run dev`, and targeted Firebase emulator checks when applicable. When adding tests, colocate `*.test.ts(x)` files next to the component and ensure they run under a future `npm test` script before merging.

## Commit & Pull Request Guidelines
Write commits in imperative voice with clear scope (e.g., "Add tenant dashboard cards"). Group related changes and avoid formatting-only commits unless intentional. Open PRs with a concise summary, list Firebase or environment changes, link to the relevant issue, and attach UI screenshots or Loom demos for visual updates. Confirm that `npm run build` and `npm run lint` pass locally, and mention any follow-up tasks in the description.

## Security & Configuration Tips
Never commit real Firebase or Stripe secrets; use `.env.local` for local overrides. Shared helpers in `lib/firebase.ts` read from `process.env`, so verify every required key exists before deploying. Coordinate config changes with the platform team and rotate keys immediately if credentials are exposed.
