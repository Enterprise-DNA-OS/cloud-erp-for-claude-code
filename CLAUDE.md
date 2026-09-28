# Cloud ERP for Claude Code

## Context

Business: [your NZ/AU group]. Operator: [name and role]. Tasman Supply Group is fictional. What matters: fulfil promises, replenish warehouses and explain internal differences without mixing entity currencies.

## Routes

Read the matching .claude/commands recipe and docs/cli.md.

| Job | Commands |
|---|---|
| Start the week | attention, dispatch, supplier-chase, weekly-review |
| Buy and fulfil | stock, replenishment, add, line, release, receive, ship, adjust-stock, cancel-order |
| Group review | subsidiaries, entity-review, intercompany, group-review, rates, set-rate, margins |
| Read records | customers, vendors, items, locations, sales-orders, purchase-orders, order, movements, activity, audit, help |
| Follow up | log, draft-order, draft-chase |
| Retain evidence | records, compliance, retain-record |
| Move and tailor | import, export, customise, new-view |
| Produce documents | npm run docs |
| Read-only dashboards | npm run view |

## Rules

Read fresh data first. Never invent records, shipments, source documents or rates. Ambiguous names list candidates and stop. Nothing sends, pays, files tax or deletes records. Drafts stay in drafts/. Never seed a real database. Read docs/compliance.md before changing retention rules. Group conversions are indicative operations reporting, not statutory consolidation. Keep each entity and currency explicit. Accounting stays with the accountant.

Use the one CLI for writes. New fields use numbered migrations, not edits to applied files. Back up, test in a temporary database, then migrate the chosen database. Money excludes tax; quantities use base units. Keep original NetSuite exports and attachments. Use explicit opening quantities. The importer is not a synchronisation service.

## Files

CLI scripts/erp.mjs. Domain scripts/lib/domain.mjs. Import scripts/lib/import.mjs. Database supabase/migrations. Brand brand.json. Documents documents.json. Views views.json. Every runtime follows AGENTS.md.

Omni by Enterprise DNA installs, customises and operates this: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=netsuite&utm_source=github
