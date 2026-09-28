# Record checks for NZ and AU companies

Sources checked 28 September 2026. This base serves NZ and AU companies. It checks recorded evidence, not the files behind a reference and not legal compliance. No filing, tax computation, payment or automatic deletion exists.

| Check | Rule and source | Implementation |
|---|---|---|
| RETENTION, NZ | Inland Revenue says keep records for at least seven tax years. [IRD record keeping](https://www.ird.govt.nz/managing-my-tax/record-keeping) | Set period_end to the end of the relevant tax year, not the invoice date. Flag retain_until earlier than period_end plus seven years. |
| RETENTION, AU companies | ASIC says retain financial records for at least seven years after the covered transactions finish. [ASIC company records](https://asic.gov.au/for-business/running-a-company/company-officeholder-duties/what-books-and-records-should-my-company-keep/) | Set period_end to the later of the reporting period end and completion of the covered transactions. Flag retention shorter than seven years. |
| ARCHIVE | Evidence-location house rule supporting retrievable records. | Flag empty archive_ref. A path alone does not prove readable or complete records. |
| BACKUP | Operator policy, not a statutory thirty-day rule. | Flag last_backup missing or more than thirty days old. Record a date only after a real backup check. |
| EMPTY_ORDER | Operational completeness policy. | Flag released orders with no value. Free-of-charge lines can produce this exception and require review. |

The operator must set the correct retention anchor and check longer obligations, disputes and legal holds with the accountant. The tax-year-end field records the entity calendar but does not infer every evidence period. A PASS does not approve offshore storage, privacy settings, tax treatment or statutory reporting. No record is deleted when its retention date arrives.
