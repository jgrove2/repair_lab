# @repair-lab/shared

zod schemas + TypeScript types shared by `api`, `web`, and `agent`.

- `src/types.ts` — entity interfaces + status unions.
- `src/schemas.ts` — zod validators + `*CreateSchema` insert schemas.

Run: `pnpm --filter @repair-lab/shared typecheck`
