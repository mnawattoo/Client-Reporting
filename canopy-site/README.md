# Canopy Vacations: "The Emerald Hour" redesign, light edition

This is the light-theme version of the redesign. The original dark version is unchanged in the `website build` folder next to this one.

What's different from the dark version:
- **Light theme throughout**: cream page, deep-teal type, a deep-teal logo, coral buttons. Photos keep white text over a soft dark shade.
- **Calmer particles**: fewer, finer particles in deep teal and coral; gentler shape changes, slower drift and a smoothed cursor. Particles still part around the mouse.
- **Full-screen property showcase**: on the home page and the rentals page, scrolling switches between the five homes full screen, with facts, a counter, a jump list and "View / Check dates / Save" buttons.
- **Pages added from the live site**: Special offers, Things to do, List your home (the homeowner sign-up form) and Favorites (hearts save homes on the visitor's device).

A static website with no build step and nothing to install. Every page is a plain `.html` file.

## Preview it

**Easiest:** double-click `index.html`. It opens in Chrome, Edge, Safari or Firefox. You need an internet connection for the fonts.

**Best:** run a tiny local server from this folder, so the forms and the page transitions behave exactly as they will live:

```
python -m http.server 8000
```

Then open http://localhost:8000

## Share a live preview link with the client (about 2 minutes, free)

1. Go to https://app.netlify.com/drop
2. Drag this whole `canopy-site` folder onto the page.
3. Netlify gives you a public link such as `https://something.netlify.app`. Send that to the client.

The contact and newsletter forms are already wired for **Netlify Forms**. Submissions show up in the Netlify dashboard under *Forms*, and you can forward them to stay@canopyvacations.com from there.

Other hosts also work as is:
- **Vercel:** `vercel.json` is included (clean URLs and redirects).
- **Cloudflare Pages / GitHub Pages / any web host:** upload the folder. The forms need Netlify, or swap the form `action` for a service like Formspree.

## Going live on canopyvacations.com

- `_redirects` (Netlify) and `vercel.json` send every old WordPress URL to its new page, so Google rankings and old links carry over.
  For example, `/vacation-rental-search/the-starfish/` goes to `/rentals/the-starfish`.
- `sitemap.xml`, `robots.txt`, canonical tags, Open Graph tags and LodgingBusiness structured data are included.
- **Booking:** "Check availability" on each home opens that home's live Streamline booking page.
  When the new site replaces the old one, point those links at the Streamline booking engine URL.
  They're the `book` values in `build.py`.

## Editing content

All copy lives in `../content.py`, in the folder above this one. Page layouts are in `../build.py`.
Edit either one and run `python build.py`; it rewrites every page.
Styles are in `assets/css/site.css`. Interactions are in `assets/js/site.js`.
The 3D particle world (logo, ocean, tunnel, coastline, sun, galaxy) is in `assets/js/world.js`.

Each section picks its particle shape with an attribute, for example `data-shape="wave"`.
Optional extras: `data-shape-x` (placement, -1 to 1), `data-shape-s` (scale) and `data-shape-a` (opacity).
The available shapes are logo, wave, ring, coast, sphere and galaxy, up to six per page.

## What's inside

| Page | File |
|---|---|
| Home | `index.html` |
| Vacation rentals | `vacation-rentals.html` |
| 5 property pages | `rentals/*.html` |
| About us | `about-us.html` |
| Property management | `property-management.html` |
| Contact us | `contact-us.html` |
| Journal (blog) + 6 articles | `blog.html`, `blog/*.html` |
| Special offers | `special-offers.html` |
| Things to do | `things-to-do.html` |
| List your home (homeowner sign-up form) | `homeowner-acquisition.html` |
| Favorites | `favorites.html` |
| Terms, Privacy, 404 | `terms-and-conditions.html`, `privacy-policy.html`, `404.html` |

## Tech notes

- Three.js 0.147, GSAP 3.12.5, ScrollTrigger and Lenis 1.1.13 are bundled in `assets/vendor`, so there's no CDN to break.
- Fonts: Playfair Display (headlines) and Lato (text), from Google Fonts.
- The particle world uses 16,000 particles on desktop and 7,000 on phones, morphing on the GPU. It pauses in background tabs.
- The logo particles are sampled from the real Canopy mark, embedded in `assets/js/logo-data.js`, so it also works when opened from a file.
- `prefers-reduced-motion` is respected: smooth scroll, shader animation and reveals turn off.
- Keyboard: skip link, visible focus rings, focus-trapped menu and photo viewer, Esc to close.
