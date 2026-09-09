# Handoff for Claude

Build a better version of **DOPAMINE MAXING** and fix the blocker that we could not kill on iPhone Safari.

## Product

A mobile-first site named **DOPAMINE MAXING**.

User can scroll one feed that mixes **TikTok**, **YouTube Shorts**, and **Instagram Reels**.

Requirements from the user, in order:

1. One site. Swipe like TikTok.
2. All three platforms in the same session.
3. Name: DOPAMINE MAXING.
4. Feeds should be watchable (3 skinny columns on iPhone is too small).
5. User picks how many socials fit the view: **1 / 2 / 3**.
6. Scrolling must NEVER open YouTube, Instagram, or TikTok.
7. Block outbound links from the video surface.

Live site the user has been testing on iPhone Safari:
https://dopamine-maxing.vercel.app

Repo:
https://github.com/willywonka773202-cloud/dopamine-maxing

## Current source

Three static files, no framework, deployed on Vercel from GitHub `main`.

- `index.html`
- `styles.css`
- `app.js`

`app.js` seeds public embed IDs for TikTok / YouTube / Instagram and lets the user paste more URLs.

Layout modes:

- **1** (phone default): full-screen slides, order TikTok → YouTube Short → Instagram → repeat
- **2**: TikTok + YouTube side by side
- **3**: all three side by side

## The bug you must fix

On iPhone Safari, **every swipe / scroll opens YouTube or Instagram**.

This is not a missing `preventDefault` in our JS. Official embeds from:

- `youtube.com` / `youtube-nocookie.com`
- `instagram.com/reel/.../embed`
- `tiktok.com/player/v1/...`

are native iframe views. iOS hit-tests them above CSS overlays and fires **universal links** / in-embed `<a>` tags (“Watch on YouTube”, “View more on Instagram”).

A swipe is treated as a tap on those links.

## Fixes already tried (do not repeat these)

These all shipped and the user said it still leaves the app:

- `pointer-events: none` on iframes
- CSS `.shield` div over each pane
- `about:blank` blocker iframe stacked on each pane
- full-screen `#lock` overlay that owns swipe (`touchstart` / `touchend` / `wheel`)
- `feed { pointer-events: none }` + custom `goTo()` paging
- removed every `OPEN` button and every `href` to YT / IG / TT from the UI
- `sandbox="allow-scripts allow-same-origin"` and tighter variants
- `youtube-nocookie.com` instead of `youtube.com`
- `controls=0`, `fs=0`, `disablekb=1`
- cache-bust query params `?v=4` through `?v=7` and instructions to close the iPhone tab

Assume the next overlay will also lose to iOS iframe hit-testing.

## What to build instead

Do **not** put a live youtube.com / instagram.com / tiktok.com iframe under the user’s finger.

Recommended approach:

1. Swipe surface is 100% our DOM. No third-party iframe receives touch.
2. Show a poster / thumbnail / muted preview we control.
   - YouTube posters: `https://i.ytimg.com/vi/{id}/hqdefault.jpg` or `maxresdefault.jpg`
   - TikTok / Instagram: oEmbed or a branded card if no public poster exists
3. If you must play real video, use a player we own:
   - YouTube IFrame API inside a container that is covered while paging, or only mounted after an explicit PLAY tap — and even then covered by a same-origin overlay during swipe
   - Do not use Instagram embed cards. They render “View more on Instagram” and are broken in third-party sites on iOS anyway
4. Keep 1 / 2 / 3 column picker.
5. Keep the visual identity: black, magenta, acid green, Anton wordmark, JetBrains Mono HUD.
6. Make 1-up on phones the default so clips are actually watchable.
7. Optional upgrades the user asked for implicitly: faster swipes, more clips, paste-your-own URLs, mute toggle, no navigation off-site.

## Constraints

- Static site is fine. No backend required.
- Public embeds only. There is no official For You page API.
- Instagram third-party embeds are unreliable on iOS. Prefer a poster card over a live embed.
- Deploy target: this same GitHub repo + Vercel project `dopamine-maxing`.

## Success test

On iPhone Safari:

1. Open the site.
2. Swipe 20 times.
3. Safari stays on dopamine-maxing.vercel.app the entire time.
4. YouTube / Instagram / TikTok never open.
5. Videos or posters are large enough to see.
6. 1 / 2 / 3 still changes how many feeds fit the screen.
