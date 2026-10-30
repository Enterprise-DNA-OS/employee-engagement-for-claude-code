# Employee Engagement for Claude Code

A trusted-operator workbench for an organisation's overall employee engagement results and agreed improvement actions. Read records before answering. The demo is fictional. This is one business per database.

## Authority and confidentiality

Never collect individual survey responses, respondent comments, employee identifiers or demographic slices. Import only the authorised overall Questions report. A missing per-question response count means the score stays unknown. A source-suppressed score stays suppressed. Never calculate a withheld score from percentages, adjacent periods or group totals.

Every mutation needs --actor, the supplied operator. This records attribution, not authenticated identity. Only the trusted operator connects to the database. No public database policies are provided. No tool sends messages, publishes, launches surveys, processes payroll or deletes records. Private drafts and exports stay on disk.

## One workflow library

| Recipe | Job |
|---|---|
| /help | See the supported commands and options. |
| /surveys | Read survey dates, owners and reporting minimums. |
| /questions | Read question codes, exact wording and factors. |
| /scorecard | Read approved overall scores and withheld states. |
| /score-changes | Compare the same question across survey dates. |
| /focus-areas | Find scores below 70 and count their open actions. |
| /action-plan | Review every commitment, owner and due date. |
| /actions-due | Find unfinished work due within seven days. |
| /stale-actions | Find open work with no check-in in fourteen days. |
| /owner-load | Compare open and overdue work by accountable owner. |
| /outcome-review | Compare completed actions with later released scores. |
| /confidentiality | List withheld results without reconstructing them. |
| /compliance | Check notice, access, retention and suppression evidence. |
| /attention | Find overdue work, blocked check-ins and reviews due. |
| /activity | Read attributed database changes. |
| /show | Read the full record and history before changing it. |
| /weekly-review | Prepare Monday priorities, overdue work and evidence checks. |
| /add-survey | Register an already closed overall survey from supplied facts. |
| /add-question | Register an original question and its factor. |
| /record-score | Record an authorised overall aggregate. Never individual answers. |
| /add-action | Attach a measurable commitment to a released baseline. |
| /start-action | Start a supplied open commitment. |
| /check-in | Record factual progress and its evidence. |
| /complete-action | Close active work after the latest check-in records completion. |
| /review-policy | Record reviewed notice evidence and future review dates. |
| /log | Record a factual operating note, never respondent comments. |
| /import | Bring in a reviewed overall Culture Amp Questions CSV. |
| /export | Write all records and audit history to a private snapshot. |
| /draft-action-brief | Prepare a private action brief for operator review. |
| /draft-weekly | Prepare the private weekly management paper. |
| /docs | Render survey briefs, action plans and outcome notes. |
| /view | Render the week, scores and evidence. |
| /customise | Add tested fields and rules through a new migration. |
| /new-view | Add a read-only report. |

The CLI is npm run engagement. All commands support --json and --key=value options. Codes, partial UUIDs and case-insensitive names resolve. On ambiguity, list the candidates and stop. A write uses one transaction with attributed before/after values. Never overwrite a result already used as an action baseline.

Read docs/replace-culture-amp.md before importing and docs/compliance.md before judging evidence. A completed action needs a completed check-in, completion evidence and a date. Later scores are comparisons, not causal claims. The business sets focus thresholds and review periods, which are policies, not laws.

## Files and deployment

DATABASE_URL selects PostgreSQL. Otherwise PGlite uses .data/db. DATA_DIR changes that location. Never seed business data. TEST_DATABASE_URL must identify an empty disposable database. Keep backups, access controls and an approved retention and erasure process outside this demo. Administrators can change history. Retention reviews do not erase records or exports.

brand.json controls documents and read-only dashboards. Use numbered migrations for customisations, run npm test and review actual reports. AGENTS.md routes every coding agent to this file and the same .claude/commands library.

Omni by Enterprise DNA installs, customises and runs it: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=culture-amp
