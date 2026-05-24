# BlaasPijl - Project TODO

## Database & Backend
- [x] Database schema: sponsors table (id, name, logoUrl, message, clickUrl, active, createdAt)
- [x] Database schema: darts table (id, sponsorId, userId, trajectoryData, firedAt, sessionId)
- [x] tRPC router: sponsors CRUD (list, create, update, delete)
- [x] tRPC router: darts (fire, list recent, get by id)
- [x] Real-time dart feed via polling

## Core Game UI
- [x] Landing page with nostalgic 80s/90s Dutch aesthetic
- [x] Dart rolling interface with animated twisted paper visual (CSS/canvas)
- [x] Microphone blow detection (Web Audio API, calibrated threshold)
- [x] Animated dart flight across screen (arc trajectory + spinning)
- [x] Canvas-based dart visual with twisted paper effect

## Sponsor Integration
- [x] Sponsor logo wrapped around dart body (CSS transform/canvas)
- [x] Clickable dart unfold/reveal animation
- [x] Sponsor message modal with clickthrough URL
- [x] Dart gallery/feed showing recent darts from all users

## Admin Panel
- [x] Admin route (role-protected)
- [x] Sponsor management: add/edit/delete sponsors
- [x] Logo upload for sponsors
- [x] Message and URL configuration per sponsor
- [x] Dart statistics overview

## Styling & Polish
- [x] 80s/90s Dutch nostalgic aesthetic (warm paper textures, retro typography)
- [x] Retro Dutch typography (Google Fonts)
- [x] Paper texture backgrounds
- [x] Responsive design (mobile + desktop)
- [x] Playful micro-animations throughout
- [x] Mobile mic blow detection UX

## Testing
- [x] Vitest: sponsor CRUD procedures
- [x] Vitest: dart fire procedure
- [x] Vitest: blow detection threshold logic

## NU.nl Demo Page
- [x] Realistic NU.nl-style news page mock (header, nav, news grid, right rail)
- [x] Thuisbezorgd.nl-style RTB billboard banner at top of page
- [x] Right rail MPU (300x250) banner slot
- [x] Dart flyover overlay on the demo page (darts fly OVER the banners)
- [x] Blow-to-shoot interface embedded in demo page
- [x] "Homepage takeover" mode: dart flies full-width over the page
- [x] Demo route /demo accessible from main nav

## Gouden Pijltje (Prize Mechanic)
- [x] Golden dart probability field on sponsors table (e.g. 1-in-20 chance)
- [x] Prize text field on sponsors table (what the winner wins)
- [x] Golden dart visual: shimmering gold exterior on the dart canvas
- [x] Special unfold animation: golden interior reveal with confetti burst
- [x] Prize modal: distinct gold-themed design with prize text and claim CTA
- [x] Win tracking: store golden dart wins in database
- [x] Admin: configure prize text and golden probability per sponsor
- [x] Vitest: golden dart probability and win tracking logic

## Dart Visual Redesign (Conical Magazine Paper)
- [x] PaperDart canvas: true elongated cone shape (sharp tip on right, wide open end on left)
- [x] Diagonal glossy magazine-strip wrapping effect on cone body (barber-pole style, photo imagery)
- [x] Sponsor logo/branding integrated as one of the diagonal glossy strips
- [x] Golden dart variant: gold foil shimmer on cone with warm glow
- [x] DartUnfoldModal: unroll animation — cone morphs back to flat rectangular magazine strip
- [x] Flat strip reveals sponsor ad/message as if it were the original magazine page
- [x] Glossy sheen effect on the flat strip (CSS gradient highlight)
- [x] Update all dart sizes/proportions to match real dart aspect ratio (long and thin cone)

## Dart Visual v3 (Cylindrical — Correct Anatomy)
- [x] PaperDart: cylindrical tube shape (uniform width, NOT a cone)
- [x] Very short sharp tip at the left end only
- [x] Horizontal magazine text/content wrapping around the cylinder body
- [x] White/light base color with black printed text (like Veronica Gids)
- [x] Red/orange sponsor color accent band on the cylinder
- [x] Sponsor name/logo as a printed label on the cylinder
- [x] Cylindrical 3D shading (top highlight, bottom shadow, curved surface)
- [x] DartUnfoldModal: unroll from cylinder to flat horizontal magazine strip
- [x] Update all dart sizes to match cylinder proportions across all pages

## Hyves/Startpagina Redesign (Early-2000s Dutch Web)
- [x] Global CSS: Verdana/Tahoma as primary fonts (no Google Fonts)
- [x] Colour palette: Hyves blue (#4a7ab5 headers), orange (#f5a623 accents), yellow (#fff3a0 highlights), white body
- [x] Bordered panel boxes with blue header bars (like Startpagina.nl widget boxes)
- [x] Beveled/raised button style (classic HTML button look)
- [x] Smiley/emoji icons in section headers (Hyves style)
- [x] Dense information layout with small text (Verdana 11px like the era)
- [x] Top navigation bar in Hyves blue with white text links
- [x] Orange gradient banner/header area
- [x] Home.tsx: full Hyves/Startpagina panel layout
- [x] Demo.tsx: retro style applied to NU.nl mock
- [x] Admin.tsx: retro style applied to admin panel

## Photo-Realistic Dart Image
- [x] Upload pijltje.png as webdev static asset
- [x] Rewrite PaperDart to use photo image instead of canvas drawing
- [x] CSS colour tinting per sponsor (hue-rotate + sepia + saturate filters)
- [x] Golden dart: gold CSS filter overlay
- [x] Spinning animation during flight using the photo image
- [x] Update DartArena to use new image-based dart
- [x] Update DartGallery to use new image-based dart
