# Lumi Edits Clone

Mobile-first social video editing platform inspired by lumi-edits.app.

## Features
- **Reels** — vertical 9:16 video feed with like/comment and scroll-snap
- **Styles** — editing style templates grid (classic, glass, dojo, clay, cleangirl, strawberry, matcha, golden, silentpower, everybody)
- **New Reel** — video trim scrub bar, style selection, publish flow
- **Chat** — conversations + message thread with video comments on timeline
- **Pay** — payment form with price display

## Design System
- Paper theme: `#f6f3ec` background, `#141518` ink, `#2f6fd0` accent
- Dark mode support
- 10 look themes

## Project Structure
```
/lumi-edits-clone/
├── api/            # Vercel serverless functions
├── app/            # Frontend SPA (PWA)
├── vercel.json     # Vercel routes
├── package.json
├── .gitignore
└── README.md
```

## Local Development
No build step required. Run locally with any static server:

```bash
# Using Vercel CLI (recommended for serverless API routes)
npm install -g vercel
vercel dev

# Or serve the app folder statically (API routes won't work without Vercel)
npx serve app -l 3000
```

Open `http://localhost:3000` (Vercel dev) or `http://localhost:5000` (static).

## Deployment
Connect this repo to Vercel for serverless API functions + static hosting.

## PWA
Includes `manifest.webmanifest` and a basic service worker for offline installability.

## License
MIT
