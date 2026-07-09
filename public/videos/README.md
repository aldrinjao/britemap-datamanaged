# Self-hosted video assets

Only **one** video is self-hosted here — the homepage hero background loop.
Everything else (the Aerial Tour gallery + the map's ▶ markers) streams from
YouTube for free, configured in `src/components/video/drone-videos.ts`.

## `hero-loop.mp4`  (referenced by `src/app/page.tsx`)

A short, silent, hard-compressed aerial loop used as the hero background.

Target specs:
- 1080p (1920×1080), H.264/AAC, `.mp4`
- 10–15 seconds, seamless loop
- **Under ~8 MB** — compress aggressively; it autoplays on every visit

Example compression with ffmpeg:

```
ffmpeg -i raw-drone-clip.mov -t 14 -an \
  -vf "scale=1920:-2" -c:v libx264 -crf 30 -preset veryslow \
  -movflags +faststart hero-loop.mp4
```

Until this file exists, the hero gracefully falls back to the `hero2.png` poster.
