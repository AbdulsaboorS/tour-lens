# Tour Lens video kit

The look, rules and code for every Tour Lens film. Each film prompt points here and only adds its story.
Sources: `AGENTS.md`, `src/styles.css`, `src/App.tsx`, `docs/writeup.md`, owner answers (2026-10-13). When this file and the repo's rules disagree, the repo wins.

## The brief (from the interview)
- Plays: a demo video with sound, sent in LinkedIn/Twitter DMs to EliseAI product people, and embedded in the GitHub README.
- Format: 16:9 (1920x1080) and 9:16 (1080x1920), one story, two crops. Length: 60 to 75 s.
- Music: a quiet original bed synthesized for this film (no license needed), under the app's real voice.
- Must show: the LG vs Samsung records mismatch, the hold with confirm, the leasing team recap.
- Ingredients: product UI only (no wordmark) · short captions plus 2 punchlines · the phone stays put while its camera feed changes room to room · finger taps, a "how it works" beat, speed proof (real response times).
- Ending: "Real responses from the working prototype. Concept demo, not affiliated with EliseAI."

## Hard rules
- Never use em dashes anywhere, including captions and the end card. (AGENTS.md)
- Copy in the owner's voice: casual, direct, plain. No corporate jargon. (AGENTS.md)
- No EliseAI logo or name in the app UI, except the not-affiliated line. (AGENTS.md)
- Fictional property, units and people: Larkspur Commons, Unit 4B. (AGENTS.md)
- Type: Inter for body, Inter Tight for headings and answers, IBM Plex Mono for eyebrows, tags and source chips, uppercase with tracking. (`src/styles.css`, `index.html`)
- Corners: 8 px buttons and inputs, 12 px cards, 16 px sheet tops, 999 px talk button, 4 px tags. (`src/styles.css`)
- Surfaces: night `#0f042d` behind the camera, paper `#faf9f7` cards, white stat tiles. (`src/styles.css`)
- Borders and shadows: 1 px `#e6e5e3` lines, card shadow `0 8px 24px rgb(0 0 0 / 18%)`. (`src/styles.css`)

## Frame (60 fps, dark stage)
- 16:9: the phone centered on the night background, captions and punchlines to its sides. 9:16: the phone fills the frame, captions in a band above the talk button.
- Words: captions in Inter 40 px at 1080p, white at 80%. Punchlines in Inter Tight 600, 120 px, key word in `#c1b8ff`.
- Scenes: UI text only inside the phone; captions outside it.

## Color
| Token | Value | Use |
|---|---|---|
| night | `#0f042d` | stage background, top bar gradient |
| paper | `#faf9f7` | cards, sheets |
| white | `#ffffff` | stat tiles, secondary buttons |
| ink | `#0e0d0c` | answers, headings |
| body | `#3f3e3c` | body text |
| muted | `#7a7977` | asked line, sources |
| line | `#e6e5e3` | dividers, borders |
| purple | `#7638fa` | talk button, primary buttons, eyebrows |
| purple press | `#5627ba` | pressed and listening states, tag text |
| purple soft | `#f2f1ff` | tag background |
| purple line | `#dfdbff` | recap timeline rule |
| lavender | `#c1b8ff` | eyebrow on dark, punchline accent |
| alert | `#b42318` | mismatch text and tag |
| alert soft | `#fef3f2` | mismatch background |

## Type
- Inter, Inter Tight, IBM Plex Mono via `@remotion/google-fonts`.
- Inside the phone, the UI renders at its real CSS sizes, with the phone scaled up as a whole.

## Signature elements
| Element | Look | Source |
|---|---|---|
| Talk button | 64 px tall pill, purple, "Hold to ask" / "Listening" / "Checking the records" | `.talk` |
| Answer card | paper card: asked line, answer in Inter Tight 17 px, source chips | `.card` |
| Mismatch | alert soft box with a solid alert "RECORDS MISMATCH" tag | `.mismatch` |
| Source chip | mono uppercase tag in purple soft, then the source | `.sources .tag` |
| Confirm sheet | paper card, "Confirm hold" primary, "Not now" secondary | `.confirm` |
| Recap | bottom sheet, three stat tiles, a timeline with a purple rule | `.recap` |

## Components
| Need | Component | In films |
|---|---|---|
| Card, Recap, Confirm, Talk button | `src/App.tsx` | redraw as pure twins (`TourPhone.tsx`): the real ones hold state and read media |
| Styles | `src/styles.css` | imported as is, so the twins share the real classes |
| Camera feed | `<video>` in `Tour` | a Remotion `<Img>` of the stop photo, slid between stops |

## Motion
- The app uses one transition: 120 ms ease-out on the talk button. Films use `cubic-bezier(0.22, 1, 0.36, 1)` for entrances (default).
- Between stops, the camera feed slides sideways inside the phone, like walking into the next room.

## Claims
- Shows: answers from the unit's records with sources, a flagged mismatch between camera and records, a hold that waits for Confirm, a recap.
- Never shows: a hold or application happening without a tap, a number the records don't contain, EliseAI branding.
- Every answer, citation, voice line and response time is real output captured from the live app (`scripts/capture.ts`). The film cuts the waiting time and shows the real time as a badge.
- Approved lines: "The model looks and talks. Code decides the facts." "Point. Ask. Get the real answer."

## Workspace
- `videos/`, its own package. Remotion 4.0.535 pinned exact. React 19.3.0 to match the app.
- `scripts/capture.ts` regenerates the real answers from photos in `public/stops/`.
- Music is generated by `scripts/music.py` into `public/audio/tour/music/` (gitignored).
