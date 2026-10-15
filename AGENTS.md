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

## Decisions (2026-10-13)
- Goal: product manager application. Audience is EliseAI product people, reached by DM.
- Deliverable: a tour video plus a PM write-up (`docs/writeup.md`), both in
  GitHub. No public live link: the deployed app sits behind an access code.
- The tour is a fictional unit shown with openly licensed footage (credits in
  `videos/public/clips/README.md`). Stops: washer (planted mismatch: records say top-load, the
  camera sees a front-loader), window, living room, dining area, then hold the unit and recap.
- Models (all free tiers): Whisper transcribes and Mistral Small 3.1 looks (Cloudflare Workers
  AI), gpt-oss-120b on Cerebras routes and phrases, Deepgram Aura 1 speaks. Cerebras free tier
  rate-limits hard, so space out test requests. The OpenAI version is in commit ecf54dc.
- Tour framing: Unit 4B is a staged model unit, so furniture in frame is staging.
- Video: made by Claude with the product-film skill from real app output on the footage. Final
  cut locked 2026-10-15 (65 s, 16:9 and 9:16). End card says the responses are real.
- Testers use the sample tour: drag the room stills like a camera. Suggested questions fall
  back to a saved real answer, labeled, when the free tiers are busy.
- Interaction: tap to talk, tap to stop. One camera frame plus one utterance per turn.
- Stack: one TypeScript app (Vite + React) with a Cloudflare Worker API, deployed to Cloudflare.
- Lint: vendored anti-slop Oxlint rules in `tools/oxlint/anti-slop/`. Code must pass `npm run lint`.
- Look: borrow EliseAI's visual language (palette, type, spacing). No EliseAI logo or name in
  the app UI except the footer line saying it's a concept demo and not affiliated.

## Style
- Never use em dashes anywhere: code, comments, docs, UI copy, commit messages.
- Docs in the owner's voice: casual, direct, plain. No corporate jargon.
- Comments sparse, only where the why isn't obvious. The code is part of the portfolio.
- No abstractions for one caller, no defensive code for impossible cases, no dead code.
- Fictional property, units and people.

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
