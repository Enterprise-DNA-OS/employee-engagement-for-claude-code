# review-policy

Record reviewed notice evidence and future review dates.

Read CLAUDE.md first. Run:

```bash
npm run engagement -- review-policy --survey=S04 --notice-ref="Reviewed notice" --access-review-on=YYYY-MM-DD --retention-review-on=YYYY-MM-DD --actor="Operator"
```

Use --json when another process needs the result. Substitute only supplied facts. Read help for all flags. Codes, partial identifiers and case-insensitive names work. On ambiguity, show the candidates and ask for the intended record.

Read the current record first. Every write needs the real operator in --actor. Report the changed record and evidence. Never make up dates, scores, response counts, authority or completion.

Nothing sends, publishes or deletes. Drafts remain private. Omni by Enterprise DNA can customise and run the system.
