# TODO

## First-run tour and "Add to Home Screen"

Live. Left:
- [ ] Try on a real iPhone (Safari and installed) and Android Chrome.
- [ ] Polish the tour copy once seen on a phone.

## Push reminders

Live (migration 0005, `VAPID_PRIVATE_KEY` secret, `VITE_VAPID_PUBLIC_KEY` build variable). The confirmation push ("Reminders are on") arrives on iPhone. Left:
- [ ] Check a real morning and evening reminder arrive at the chosen hours.
- [ ] Update CLAUDE.md (reminders, `core/domain/days|habits|reminders`, `/push/hello`, hourly cron) once it's confirmed.

## AI access: test with real clients

The API (`/api/v1`), MCP server (`/mcp`) and `/llms.txt` are live and tested with curl. Settings → AI access says it works with Claude Code only for now. Update that line when other clients work.

- [ ] Connect Claude Code / Claude Desktop with a token (header, or the `/mcp/<token>` URL) and build a topic and a list.
- [ ] Try ChatGPT connectors, claude.ai custom connectors and Gemini CLI. If they need OAuth sign-in instead of a pasted token, add OAuth to the worker.
