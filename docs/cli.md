# CLI reference

Node 20 or later. Commands work in Windows and Linux shells. Quote names and notes. Append --json for structured output. Names match case-insensitively by substring, IDs by prefix, imported line IDs by their external value. Multiple matches list candidates and exit 1.

| Command | Purpose |
|---|---|
| `subsidiaries` | List legal entities with base currency and tax-year end. |
| `customers` | List customer records. |
| `vendors` | List supplier records. |
| `items` | List products and base units. |
| `locations` | List warehouses and the entity that owns each one. |
| `sales-orders` | Review customer order totals and remaining value. |
| `purchase-orders` | Review purchasing totals and remaining value. |
| `attention` | Find overdue, quiet and unreleased orders. |
| `dispatch` | Review outstanding sales lines against local stock. Availability is per line, not a reserved allocation. |
| `stock` | Show stock, open commitments and incoming purchases. |
| `replenishment` | Find stock below reorder point after open sales and purchases. |
| `supplier-chase` | List purchases due within seven days or already late. |
| `intercompany` | Match reciprocal entity records by reference and currency. Surface missing sides, amount differences and evidence gaps. |
| `entity-review` | Group open order value by entity, currency and type. |
| `margins` | Show fulfilled sales less the unit cost frozen on each order line. |
| `rates` | List dated rates and their sources. |
| `records` | List archive and retention evidence. |
| `movements` | Read stock history, including opening counts. |
| `audit` | Read the recorded CLI change history. |
| `activity` | Read order follow-up notes. |
| `compliance` | Read docs/compliance.md and show every record exception. A clear result is not certification. |
| `group-review [YYYY-MM-DD]` | Translate current open orders to indicative NZD using rates no later than the supplied date. Highlight stale or missing rates. This is not a historical order snapshot or statutory consolidation. |
| `order <name-or-id>` | Read the full order, lines and notes. |
| `weekly-review` | Read attention, dispatch and intercompany in one run. Write the Monday priorities from those three results. |
| `add <entity> <JSON>` | Read docs/cli.md for entity fields. Record factual input, then read back the new record. |
| `line <order> <item> <quantity> <unit-price> <unit-cost>` | Read the draft order and item. Add a line with explicit quantity, price and cost. |
| `release <order>` | Read the draft and verify quantities, warehouse and counterparty. Release only a nonempty draft. |
| `cancel-order <order>` | Read the order. Only draft or open orders with no fulfilled quantities can be cancelled. |
| `ship <line-id-or-external-id> <quantity> <unique-event-reference>` | Read the order and stock. Record physically dispatched goods with a unique reference. Never infer delivery. |
| `receive <line-id-or-external-id> <quantity> <unique-event-reference>` | Read the order. Record only goods physically received with a unique reference. |
| `adjust-stock <location> <item> <signed-quantity> <unique-reference> <reason>` | Read stock and movements. Apply a documented count correction, with reason and unique reference. |
| `log <order> <note>` | Read the order. Add a factual follow-up note. |
| `set-rate <NZD|AUD> <YYYY-MM-DD> <NZD-per-unit> <source>` | Record an operator-verified conversion rate with its source. Never fetch or invent a live rate. |
| `retain-record <record> <retain-until> <archive-reference> <backup-date>` | Read the evidence register and docs/compliance.md. Record the archive location, retention deadline and actual backup date. |
| `draft-order <order>` | Read the order and create a draft in drafts/. Nothing sends. |
| `draft-chase <purchase-order>` | Read the purchase order and notes. Draft a supplier delivery question in drafts/. Nothing sends. |
| `import netsuite <directory> [--apply]` | Read docs/replace-netsuite.md. Preview first, reconcile counts and values, then apply the same bundle. |
| `export <snapshot.json>` | Write a full JSON snapshot including stock, evidence and audit. Protect and test the backup. |
| `help` | List available commands and read docs/cli.md for arguments. |

## Adding records

`add <entity> <JSON>` accepts subsidiaries (name, country NZ/AU, currency NZD/AUD, tax_year_end), partners (name, kind customer/vendor), items (name, unit), locations (name, subsidiary_id), orders (name, subsidiary_id, location_id, partner_id, kind sale/purchase, currency, due_date), intercompany (name, subsidiary_id, counterparty_id, side receivable/payable, currency, amount, due_date, evidence), and evidence (name, subsidiary_id, period_end, retain_until, archive_ref, last_backup). Foreign keys use full UUIDs from reads. Dates are YYYY-MM-DD. Orders start draft. Country and currency are explicit, not guessed.

## Arithmetic and controls

Money uses fixed decimal amounts excluding tax. Quantities use each item's base unit. An order uses its entity's base currency and one warehouse owned by that entity. Sales require a customer and purchases a vendor. Multiple warehouses require separate orders. Replenishment = max(commitments + reorder point - on hand - incoming, 0). It is a quantity plan, not time-phased demand planning. Dispatch checks each line against stock; it does not reserve stock for every competing order.

Ship and receive hold the order and stock changes in one transaction. No over-fulfilment or negative stock. Unique event references replay identical work without moving stock again. A changed replay fails. Full fulfilment closes the order. Cancellation cannot erase fulfilment. Physical corrections use documented stock adjustments. Commercial returns and credit notes require a designed extension and the accountant's ledger.

Margins use completed units and the cost recorded on the order line. They are not FIFO, inventory valuation or accounting profit. Entity review never sums different currencies. Group review translates the current open-order book to NZD with the latest rate at or before the requested date, flags rates older than seven days, and leaves missing conversions blank. The supplied date selects rates only. It does not reconstruct historical orders. It does not eliminate intercompany balances or produce financial statements.

Intercompany records are manually verified balance snapshots in a common transaction currency. Matching requires reciprocal entity IDs, the same reference and the same currency. Each side can appear only once per entity/reference. Different currencies remain unmatched. These are not journals or payments.

Export is a consistent JSON snapshot of every domain table. Retain original exports too. Restore through a reviewed migration into a new database in dependency order; test it before relying on backups. Shared Postgres access needs scoped roles and verified TLS. The base is a trusted-operator CLI, not a permissions service.
