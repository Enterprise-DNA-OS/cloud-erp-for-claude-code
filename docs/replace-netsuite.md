# Move operational records from NetSuite

This is an operational starting point for orders, stock and entity reviews. Keep the accounting ledger, source documents and existing statutory processes. The importer accepts configured saved-search CSV exports, not an arbitrary Full CSV Export archive. Custom columns and non-English headings need mapping. Fixtures are fictional examples.

## Export once, reconcile before cutover

Oracle documents [CSV export of search results](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N663983.html) and [transaction searches for reimport](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N432599.html). Checked 28 September 2026. Export requires appropriate account permissions. For order headers use one row per transaction. For lines use Main Line = False and remove tax, shipping and duplicate join rows. Oracle explains [Main Line](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4459563851.html).

Create searches with the labels below, then export CSV to one directory. Use stable Internal IDs for records and related records. Lines need a unique line identifier labelled Internal ID, plus the transaction's ID labelled Order Internal ID. Never repeat the transaction ID as every line's identifier. Use remaining unfulfilled quantities, not original quantities, for the opening order book. Label the net price Rate. Unit Cost must be a verified operational cost, not a guessed value. Keep the original full export separately for history.

| File | Exact column labels |
|---|---|
| subsidiaries.csv | Internal ID, Name, Country, Currency, Tax Year End |
| customers.csv | Internal ID, Name |
| vendors.csv | Internal ID, Name |
| items.csv | Internal ID, Name, Units |
| locations.csv | Internal ID, Name, Subsidiary Internal ID |
| orders.csv | Internal ID, Document Number, Subsidiary Internal ID, Location Internal ID, Name Internal ID, Type, Currency, Due Date |
| lines.csv | Internal ID, Order Internal ID, Item Internal ID, Quantity, Rate, Unit Cost |
| stock.csv | Internal ID, Location Internal ID, Item Internal ID, On Hand, Reorder Point |
| intercompany.csv | Internal ID, Reference, Subsidiary Internal ID, Counterparty Internal ID, Side, Currency, Amount, Due Date, Evidence |
| evidence.csv | Internal ID, Name, Subsidiary Internal ID, Period End, Retain Until, Archive Reference, Last Backup |

Country accepts New Zealand/NZ and Australia/AU. Currency is NZD or AUD. Type accepts Sales Order or Purchase Order. Side is receivable or payable. Dates must be converted to YYYY-MM-DD. Numeric cells contain plain unsigned decimal values without currency signs or grouping separators. Each order has one location and uses its subsidiary base currency. Split multi-location orders and map foreign-currency orders in the custom installation. Intercompany files and the evidence register need those explicit custom labels and operator review.

Stock Internal ID is a stable unique key for the item/location pair. The base imports opening counts once. It never imports a later count over live movements. Intercompany references use the same value, currency and opposite entity IDs on each side. Tax-year-end and evidence dates are operator inputs. Files are optional, but all references must exist in earlier files or the database.

## One command for the bundle

On a new, migrated database that has never been demo-seeded:

`npm run erp -- import netsuite exports`

This validates all supported files in dependency order, writes inside a transaction, and rolls it back. Review file counts. Then:

`npm run erp -- import netsuite exports --apply`

The whole bundle commits or rolls back together. Orders arrive as drafts. Check entity, warehouse, units, quantities and money against NetSuite, then release the accepted orders. Identical repeated records are skipped. Existing records with changed supplied fields are rejected rather than overwritten. This is an opening migration, not continuous synchronisation. Import opening stock before real movements. Do not import the same files into a seeded demo.

## What carries and what stays

Subsidiaries, customers, vendors, items, warehouses, open order lines, opening stock, manually prepared intercompany balances and archive evidence carry across. The ledger, historical shipments, invoices, tax postings, bank feeds, payments, payroll, attachments, roles, saved-search definitions, SuiteScript and approval workflows do not come through this importer. Keep original exports and attachments in your archive. Enterprise DNA scopes historical mapping and connections in your custom version.

Run both systems on a sample, check quantities by location and totals by entity/currency, test partial receipts and shipments, reconcile counterpart balances and sign off with the operator before cutover. A prepared supported bundle imports in one command. Preparing and validating a full NetSuite estate is a separate job.
