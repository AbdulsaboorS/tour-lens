# tour-lens

Point your phone at something during a self-guided apartment tour, ask "what's this?", and get
a spoken answer from that unit's actual records, with the source shown. Not a guess.

A concept demo I built for my EliseAI product manager application. It extends AI-Guided Tours.
Not affiliated with EliseAI. The property, units and people are made up.

- **Demo video:** coming today
- **The product write-up:** [docs/writeup.md](docs/writeup.md)
- **Research:** [docs/research.md](docs/research.md)

## How it works

1. Hold the button and ask. The app grabs one camera frame and your audio.
2. The Worker transcribes the question. A vision model says what it sees, picks which records
   apply, and answers yes/no visual checks. It never states facts.
3. Code pulls those records from `worker/records.ts` and flags any place the camera
   contradicts them.
4. A second model call phrases the answer using only that briefing, then it's spoken back.
5. Holds run only after you tap Confirm. The recap collects everything for the leasing team.

## Run it

```
npm install
printf 'OPENAI_API_KEY=sk-...\nACCESS_CODE=pick-one\n' > .dev.vars
npm run dev
```

Camera access needs HTTPS on a phone, so test on the deployed Worker (`npm run deploy`, then
`wrangler secret put OPENAI_API_KEY` and `wrangler secret put ACCESS_CODE`).

`npm run lint` runs the vendored [anti-slop](https://github.com/dmmulroy/anti-slop) Oxlint rules.
