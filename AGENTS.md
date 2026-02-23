# AGENTS Instructions

## Prisma Migrations (Mandatory)

- Never write Prisma migrations by hand.
- Never create or edit `migration.sql` manually.
- Always generate migrations with Prisma CLI only.

Use this command pattern:

```bash
pnpm --filter backend prisma:migrate -- --name <migration_name>
```

If migration generation fails (DB unavailable, schema engine error, permissions, etc.):

- Stop and report the blocker.
- Do not create a manual migration as a workaround.
