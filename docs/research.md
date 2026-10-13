# Research (2026-10-13)

Two research passes, mostly from vendor pages and press releases. Some sites (Tour24, Rently,
EliseAI help docs) blocked direct reads, so those parts rest on search snippets.

## EliseAI AI-Guided Tours (AIGT)
- Launched 2025-01-06, part of LeasingAI. https://eliseai.com/blog/self-guided-apartment-tours-reinvented-introducing-eliseais-ai-guided-tours
- No app. Runs over SMS/MMS and a mobile web app. Booking via ILS, chat, SMS, email or voice.
  Optional ID check and card hold, then a one-time access code. Directions by text, feedback and
  application link after, synced to CRM/PMS.
- Smart locks: IglooHome, Yale, Brivo, Schlage, Dormakaba, Salto, Masterlock, lockboxes.
  Brivo one-tap unlock in the web app (2025-06). DOOR partnership (2026-09-24). ButterflyMX passes.
- Mid-tour questions: by text or phone call (their VoiceAI product). No in-browser voice.
- Location: Engrain interactive map with live GPS position (2025-04).
- Not found: camera, computer vision, object detection, AR, beacons, per-room content.

## EliseAI the company
- 2026-09-29: $350M at $4B (a16z, Bessemer). ARR over $200M (June 2026). Says 1 in 6 US apartments.
- Apollo (2026-09): agentic teammate for operators, text and voice, no camera.
- Housing: CRM, VoiceAI, LeasingAI, ResidentAI (maintenance, renewals, delinquency).
- Healthcare: HealthAI (patient calls, scheduling, intake, prior auth), 3,500+ orgs.
- Stack clues: TypeScript/React, Python a plus, AWS. OpenAI customer story (2025). No public vision work.

## Does the idea already exist?
- Tour24 "Tori" (2025-11) and Peek: in-tour Q&A by chat. No camera.
- Rently, SmartRent, Entrata ELI+, Funnel, Knock/Zuma: pre-tour leasing agents. No camera.
- Matterport Property Intelligence: vision on 3D scans, offline, not conversational.
- Apartments.com and Zillow inside ChatGPT: remote listing search, not on-site.
- Inspection apps (Shipshape, InspectorIQ): read appliance data plates for inspectors.
- ChatGPT video, Gemini Live, Meta glasses, OpenAI Realtime with images: see and talk, but
  generic. They know "a Nest thermostat", not "this unit's 2023 LG washer, pods allowed".
- Verdict: in-person tour + camera + voice + property-grounded answers + leasing actions is not
  shipped anywhere we could find.

## What makes it more than ChatGPT with a camera
1. Identify the specific item in this unit, and say when the view and the records disagree.
2. Code decides facts, every answer cites a record.
3. Knows where the prospect is (unit from the unlock event), so "what's the view like" is right.
4. Leasing actions with confirmation: compare units, hold, book a follow-up, start an application.
5. Recap for the leasing team: what they pointed at, asked, and objected to.
