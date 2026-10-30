# Employee Engagement for Claude Code

Turn your overall employee survey results into owned action plans, evidence and weekly follow-through.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install the demo and use your own database. | Your questions, action rules, history mapping and management papers. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=culture-amp&utm_source=github&utm_medium=readme) · [Instead of Culture Amp](https://enterprisedna.co/omni/instead-of/culture-amp)

## Quick start

Node 20 or later.

```bash
git clone https://github.com/Enterprise-DNA-OS/employee-engagement-for-claude-code.git
cd employee-engagement-for-claude-code
npm install
npm run demo
npm run engagement -- weekly-review
npm run docs
npm run view
```

Open the folder in Claude Code, Codex, OpenCode or Cursor. Every runtime uses CLAUDE.md through AGENTS.md. Local PGlite needs no server. DATABASE_URL selects PostgreSQL. DATA_DIR selects a different local data directory. Never seed business records.

## The weekly operating cycle

Register a closed survey and its purpose, approved notice and review dates. Import its approved overall question scores. Find weak scores with no action, agree an owner and target, and record progress with evidence. Close completed work, then compare a later survey against the original baseline. Review withheld results and overdue access or retention evidence without trying to identify respondents.

Thirty CLI commands and 34 executable slash-command recipes. Every CLI command supports --json. Use --key=value flags. References accept exact codes, partial UUIDs or case-insensitive names. Ambiguous matches list candidates and exit 1.

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

/docs renders paperwork. /view renders dashboards. /customise changes fields and rules with tested migrations. /new-view adds another read-only report.

## Ten questions the demo answers

1. Which engagement commitments are overdue or blocked? Run attention.
2. Which weak scores have no active action attached? Run focus-areas.
3. Which actions have gone quiet for two weeks? Run stale-actions.
4. Whose open commitments are already late? Run owner-load.
5. Did later scores meet the targets for completed actions? Run outcome-review.
6. Which latest results remain withheld? Run confidentiality.
7. How did the same question change between surveys? Run score-changes.
8. Which surveys need notice, access or retention evidence reviewed? Run compliance.
9. What is due before the end of next week? Run actions-due.
10. Who changed an action and what evidence was recorded? Run show --action=A03.

These are executable questions across this business's records. Culture Amp already offers scores, comparisons, benchmarks and action plans. We do not claim it cannot answer these questions. The difference is owning and changing the operating rules. [Real command captures](docs/demo-captures.json).

## Confidentiality that follows the records

Only overall question aggregates enter this workbench. Employee identifiers, respondent comments and demographic exports are rejected. A released score needs a per-question response count meeting the survey minimum, at least five. The operator must set a higher minimum when the source policy requires it. Source-suppressed values and missing counts become null before storage, including audit history. No demographic intersections or withheld-score reconstruction are supported.

Actions require a released baseline. A referenced baseline cannot be rewritten by the CLI. Completion needs evidence and a completed check-in. The outcome view uses the latest later survey after completion, even if that result is withheld. It does not silently select an older favourable result. Observed change does not prove that the action caused it.

All writes record actor and before/after values. Names do not authenticate operators and the audit is not tamper-proof. Public database privileges are revoked. Deployment access, encryption, backups and approved erasure need their own operating controls. [Checks and sources](docs/compliance.md).

## Switch the operating records in a day

Export the authorised overall Questions report from Culture Amp. Review the field map and response counts, then run:

```bash
npm run engagement -- import culture-amp --survey=S04 --file=imports/questions.csv --map=imports/field-map.json --source-ref="Approved overall export" --actor="Operator" --dry-run
npm run engagement -- import culture-amp --survey=S04 --file=imports/questions.csv --map=imports/field-map.json --source-ref="Approved overall export" --actor="Operator"
```

The prepared export imports in one command. Survey registration and field mapping happen first. Missing response counts keep scores withheld until an authorised source supplies them. Changed rows need --update. Invalid batches roll back completely. The fixture is synthetic, not a captured vendor export. [Full replace guide](docs/replace-culture-amp.md).

This base manages results and follow-through, not employee survey delivery, licensed question banks, external benchmarks or the full Culture Amp platform. Use your existing approved collection process, or have Enterprise DNA build the agreed collection and access workflow into your version. No live Culture Amp connection is required.

## Documents and views

Change brand.json once. npm run docs produces survey results briefs, action plans and outcome review notes as branded HTML. npm run view produces the week, score comparisons and evidence reviews. Keep outputs private, open them in a browser and print after checking. The reports are read-only snapshots. [Why there is no front end](docs/why-no-front-end.md).

## Your first hour: ten things to ask for

1. Put our name and colours on the management papers.
2. Register our latest closed survey and its approved notice.
3. Set our real confidentiality minimum.
4. Map the overall question export and check a dry run.
5. Explain which scores are withheld and why.
6. Find weak scores without a current action.
7. Assign our first action with an owner, date and target.
8. Record progress evidence from our weekly review.
9. Add an action sponsor through a tested migration.
10. Draft the next management paper with later-score comparisons.

## Validation

npm test creates a disposable database, migrates twice, seeds twice and exercises every CLI command. It checks suppression, action transitions, baseline protection, atomic imports, attributed changes, exports and escaped HTML. CI is configured for Windows and Linux on Node 20/22 plus PostgreSQL 17. [Actual checks and limits](docs/validation.md).

## Built and run for you

Enterprise DNA maps your records, builds your review process and adds a web front end, survey collection or a different stack to the agreed scope. Omni by Enterprise DNA installs and runs it for one setup fee, then a retainer. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=culture-amp&utm_source=github&utm_medium=readme).

MIT. Not affiliated with Culture Amp or Anthropic. Hosting and agent use have their own costs. [Candidate research](docs/research.md).
