# Replace Culture Amp result operations

Omni by Enterprise DNA brings the approved records across and builds the agreed process.

## Export from the vendor

In Culture Amp, select the closed survey, View reports, then Questions or Insight. Use the overall report with no demographic filters. Select Export and CSV. The vendor also supports spreadsheet formats. This importer accepts CSV, so save a spreadsheet export as UTF-8 CSV first. [Official export guide](https://support.cultureamp.com/en/articles/8438326-survey-export-options), checked 30 October 2026.

Do not request raw data, de-identified raw responses, comments or demographic heatmaps. They are outside this importer. Vendor permission and export availability depend on the survey and role. This is not a promise that every account exposes the same headers or per-question counts.

## Prepare the one-command import

Register the closed survey with add-survey, including its exact reporting minimum, owner, purpose, notice reference and review dates. Read help for the flags. Keep the CSV and mapping under ignored imports/.

Copy fixtures/field-map.json into imports/field-map.json. Map exact headers for question text, factor and favourable percentage. Map a stable question code when the source has one. Otherwise a stable code is derived from exact question wording. Map per-question response counts only when the export actually provides them. Participation percentages or the survey-wide invitation count are not response counts. Missing counts make scores unknown. A higher source reporting minimum must be configured on the survey before import.

The map declares scope overall. This is the operator's attestation, not automatic proof about the original report. Review every column and put only harmless unused report metadata in ignore. The importer rejects unexpected columns and headers indicating identifiers, comments or demographic data. Never rename a disallowed column to bypass that check.

Run a dry run:

```bash
npm run engagement -- import culture-amp --survey=S04 --file=imports/questions.csv --map=imports/field-map.json --source-ref="Approved overall report" --actor="Operator" --dry-run
```

Review the inserted, unchanged and withheld counts. Remove --dry-run to write the prepared report in one command. Dates, question wording and results must match the source. The synthetic fixtures document the mapping contract, not a claim about universal vendor headers.

## Mapping and reconciliation

Question text and factor become the question record. The mapped code or exact-wording hash identifies the question. The selected survey supplies the period and confidentiality minimum. Scores accept percentages from zero to one hundred. A percent sign is optional. Decimal fractions are not automatically multiplied by one hundred.

Blank, dash, n/a and suppressed score markers stay withheld. Counts below the minimum are removed with their scores before storage and auditing. Missing counts produce an unknown state. Every row keeps its source reference and a digest of sanitised data, not the original sensitive file. Unknown columns are not retained.

Identical re-imports do nothing. Changed data requires --update. A score used as an action baseline cannot be overwritten. A malformed row, duplicate question or wording mismatch rolls back the whole batch. Reconcile row counts and source references after import with scorecard and show. Preserve original exports only in the organisation's approved restricted archive.

## What needs separate work

Action history is entered from approved evidence using add-action, check-in and completion commands. Respondent comments, individual responses, demographic breakdowns, licensed benchmarks, survey delivery, vendor integrations and proprietary question libraries do not transfer through this importer. Do not copy licensed material without rights. Enterprise DNA scopes the collection, access and history work with the owner.

A prepared report moves in a day. Permission requests, confidentiality decisions and historical reconciliation can take longer. Export produces a full JSON snapshot or a selected record type as CSV. The snapshot is an archival export, not an automated restore command. Production backup and recovery need a tested database backup process.
