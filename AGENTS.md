# AGENTS.md

Read this, then `docs/research.md`, then `SESSION.md` (local only, gitignored), then `git log --oneline -10`.

## What this is
A demo for an EliseAI application. It extends their AI-Guided Tours (self-guided apartment tours
run over SMS, phone and a mobile web app). During a tour the prospect points their phone camera at
something and asks out loud "what's this?" or "what's this like?". A voice agent answers, grounded
in this unit's own records, and can take leasing actions with the prospect's confirmation.

Nothing shipped does this as of 2026-10. Tour products answer by text or phone call and can't see.
Camera assistants (ChatGPT, Gemini Live) can see but don't know the building. See docs/research.md.

## The one invariant
The model looks and talks. Plain code decides the facts. Prices, fees, policies, availability and
unit specs come from code reading the property data, and every answer cites the record it used.
If what the camera sees doesn't match the records, the agent says so. Leasing actions (hold,
book, apply) run only after the prospect confirms.

## Open decisions (decide before building past the prototype)
- Budget: zero cost (Cloudflare Workers AI vision + STT/TTS) vs a few dollars (OpenAI Realtime).
- Scope: a recorded video of one tour vs a link a recruiter can try on their own phone.
- Stack: phone web app (TypeScript/React, matches EliseAI) + Python backend.

## Style
- Never use em dashes anywhere: code, comments, docs, UI copy, commit messages.
- Docs in the owner's voice: casual, direct, plain. No corporate jargon.
- Comments sparse, only where the why isn't obvious. The code is part of the portfolio.
- No abstractions for one caller, no defensive code for impossible cases, no dead code.
- Fictional property, units and people. Don't imitate EliseAI's branding.

## Workflow
- Commit in small logical steps and `git push origin main` after every commit.
- End every session by rewriting `SESSION.md`: what got done, what's next, open problems. Max 60 lines.
- Keep this file under 100 lines. Update it when a decision changes, not with progress notes.

## Agent skills

### Issue tracker
GitHub Issues on AbdulsaboorS/tour-lens, via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels
Default five: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs
Single-context: one `CONTEXT.md` + `docs/adr/` at the root. See `docs/agents/domain.md`.
