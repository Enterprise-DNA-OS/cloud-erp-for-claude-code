# Cloud ERP for Claude Code

Multi-entity orders, stock and intercompany checks in a database you own. An operational base for NZ and AU distributors and manufacturers. MIT licensed. Runs with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free. Clone, run the demo, map your exports. | Your fields, rules, NetSuite records, screens or different stack. | Installed and operated inside Omni by Enterprise DNA. Setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=netsuite&utm_source=github&utm_medium=customise) | [Book Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=netsuite&utm_source=github&utm_medium=managed) |

## The weekly work

Plan dispatch, chase suppliers, replenish each warehouse, review the entities and reconcile intercompany records. The database holds customers, vendors, products, warehouses, orders, partial fulfilment, stock movements, rate sources, retained evidence and a change history. Accounting remains with the accountant.

NetSuite's [own pricing section](https://www.netsuite.com/portal/products/erp.shtml), checked 28 September 2026, describes annual licensing for the core platform, optional modules and users, plus implementation. It publishes no amount there. Bring your actual renewal quote to the comparison. This base is not full NetSuite or OneWorld parity.

## Quick start

Node 20 or later on Windows or Linux:

```bash
git clone https://github.com/Enterprise-DNA-OS/cloud-erp-for-claude-code.git
cd cloud-erp-for-claude-code
npm install
npm run demo
npm test
npm run view
npm run docs
```

Open the folder in your agent and ask which orders cannot ship this week. Fictional Tasman Supply Group has an overdue NZ order, an AU order, a late purchase, mismatched internal balances and a stale demo exchange rate. Demo dates are relative to the first seed. Re-seeding does not reset existing records. No demo rate is market data.

PGlite stores local data in .data/db. For real data, choose a fresh DATA_DIR, migrate and import without seeding. DATABASE_URL selects Postgres. Configure scoped access, verified TLS, backups and a tested restore before sharing. One local PGlite process at a time.

## Commands

39 CLI commands and 41 slash recipes. Every CLI command has --json output and a matching recipe, plus /customise and /new-view. [Arguments and boundaries](docs/cli.md).

- /subsidiaries: List legal entities with base currency and tax-year end.
- /customers: List customer records.
- /vendors: List supplier records.
- /items: List products and base units.
- /locations: List warehouses and the entity that owns each one.
- /sales-orders: Review customer order totals and remaining value.
- /purchase-orders: Review purchasing totals and remaining value.
- /attention: Find overdue, quiet and unreleased orders.
- /dispatch: Review outstanding sales lines against local stock. Availability is per line, not a reserved allocation.
- /stock: Show stock, open commitments and incoming purchases.
- /replenishment: Find stock below reorder point after open sales and purchases.
- /supplier-chase: List purchases due within seven days or already late.
- /intercompany: Match reciprocal entity records by reference and currency. Surface missing sides, amount differences and evidence gaps.
- /entity-review: Group open order value by entity, currency and type.
- /margins: Show fulfilled sales less the unit cost frozen on each order line.
- /rates: List dated rates and their sources.
- /records: List archive and retention evidence.
- /movements: Read stock history, including opening counts.
- /audit: Read the recorded CLI change history.
- /activity: Read order follow-up notes.
- /compliance: Read docs/compliance.md and show every record exception. A clear result is not certification.
- /group-review: Translate current open orders to indicative NZD using rates no later than the supplied date. Highlight stale or missing rates. This is not a historical order snapshot or statutory consolidation.
- /order: Read the full order, lines and notes.
- /weekly-review: Read attention, dispatch and intercompany in one run. Write the Monday priorities from those three results.
- /add: Read docs/cli.md for entity fields. Record factual input, then read back the new record.
- /line: Read the draft order and item. Add a line with explicit quantity, price and cost.
- /release: Read the draft and verify quantities, warehouse and counterparty. Release only a nonempty draft.
- /cancel-order: Read the order. Only draft or open orders with no fulfilled quantities can be cancelled.
- /ship: Read the order and stock. Record physically dispatched goods with a unique reference. Never infer delivery.
- /receive: Read the order. Record only goods physically received with a unique reference.
- /adjust-stock: Read stock and movements. Apply a documented count correction, with reason and unique reference.
- /log: Read the order. Add a factual follow-up note.
- /set-rate: Record an operator-verified conversion rate with its source. Never fetch or invent a live rate.
- /retain-record: Read the evidence register and docs/compliance.md. Record the archive location, retention deadline and actual backup date.
- /draft-order: Read the order and create a draft in drafts/. Nothing sends.
- /draft-chase: Read the purchase order and notes. Draft a supplier delivery question in drafts/. Nothing sends.
- /import: Read docs/replace-netsuite.md. Preview first, reconcile counts and values, then apply the same bundle.
- /export: Write a full JSON snapshot including stock, evidence and audit. Protect and test the backup.
- /help: List available commands and read docs/cli.md for arguments.

## Ten questions beyond a fixed dashboard

These are working analyses you can change. NetSuite supports configurable searches and reports too; we do not claim these questions are impossible there.

1. Which late orders have also gone quiet? `npm run erp -- attention`
2. Which warehouse cannot cover its promised dispatch? `npm run erp -- dispatch`
3. Which purchases need a supplier answer this week? `npm run erp -- supplier-chase`
4. What should we buy after counting open commitments and incoming stock? `npm run erp -- replenishment`
5. Which entity holds the open sales value in each currency? `npm run erp -- entity-review`
6. Which intercompany references have different amounts on each side? `npm run erp -- intercompany`
7. Which internal balance has no matching counterparty record? `npm run erp -- intercompany`
8. Which group totals rely on stale or missing conversion rates? `npm run erp -- group-review`
9. What margin did we ship at the recorded line cost? `npm run erp -- margins`
10. Which archives lack evidence or enough retention time? `npm run erp -- compliance`

## Your first hour: ten things to ask for

1. Put our name and colours on the order paperwork.
2. Add our legal entities and warehouse names.
3. Preview one set of NetSuite saved searches.
4. Find orders that are late and quiet.
5. Explain what each warehouse is short of.
6. Draft the overdue supplier chase.
7. Show mismatched internal balances.
8. Explain the stale exchange-rate warning.
9. Add our purchasing reference through a numbered migration.
10. Create a read-only warehouse-manager view.

## Paperwork and views

Edit brand.json once. npm run docs writes draft order confirmations, purchase orders, intercompany confirmations and retention reviews under docs-out/. npm run view writes week and group HTML snapshots under views/. Draft correspondence stays in drafts/. Nothing sends or posts. /new-view extends the same renderer. /customise adds fields or rules through a tested migration.

## Bring your records

[NetSuite export and mapping guide](docs/replace-netsuite.md). A prepared bundle imports with `npm run erp -- import netsuite exports --apply`. Preview without --apply first. The base accepts specified saved-search labels and remaining open quantities. Existing changes fail rather than overwriting live work. Keep original history and attachments. Reconcile all opening balances before release.

## Controls and limits

Stock cannot go negative. Fulfilment cannot exceed remaining quantity. Duplicate event references do not duplicate stock movements. Failed writes and imports roll back. Entity currencies remain separate until explicitly translated. Group review uses dated rates, flags stale or absent rates, and reports indicative NZD, not financial consolidation or intercompany eliminations. Line costs are operational snapshots, not FIFO or statutory valuation.

[Compliance checks](docs/compliance.md) flag retention, archive and backup gaps. They are record checks, not legal certification. [Why no front end](docs/why-no-front-end.md) explains phone, offline and scanning needs.

There is no general ledger, payment execution, payroll, tax filing, financial consolidation, manufacturing planning or live bank feed. The base runs local operations independently; the custom installation scopes the accounting connections and screens you need. Hosting and agent usage have their own costs.

## Verification

npm test migrates a temporary PGlite database, seeds twice, exercises every CLI command, and checks stock rollback, replay protection, cross-entity warehouses, separate currencies, missing rates, import rollback, ambiguity, drafts and branded HTML. It uses Node subprocesses and portable paths. Linux is verified in this run. Windows and hosted Postgres use the same code but need their own execution checks.

MIT. Built by Enterprise DNA. Not affiliated with Oracle or Anthropic. [Omni by Enterprise DNA](https://enterprisedna.co/omni/instead-of/netsuite?utm_source=github&utm_medium=readme&utm_campaign=netsuite).
