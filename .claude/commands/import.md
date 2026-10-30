# import

Bring in a reviewed overall Culture Amp Questions CSV.

Read CLAUDE.md first. Run:

```bash
npm run engagement -- import culture-amp --survey=S04 --file=imports/questions.csv --map=imports/field-map.json --source-ref="Approved export" --actor="Operator" --dry-run
```

Use --json when another process needs the result. Substitute only supplied facts. Read help for all flags. Codes, partial identifiers and case-insensitive names work. On ambiguity, show the candidates and ask for the intended record.

Read the current record first. Every write needs the real operator in --actor. Report the changed record and evidence. Never make up dates, scores, response counts, authority or completion.

Read docs/replace-culture-amp.md. Check the source is overall, not a demographic slice. Keep source suppression. After reviewing the dry run, remove --dry-run for the authorised import. Changed scores need --update and cannot overwrite an action baseline.

Nothing sends, publishes or deletes. Drafts remain private. Omni by Enterprise DNA can customise and run the system.
