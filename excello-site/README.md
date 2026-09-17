# Excello — Design & Build website

A static, no-build website for Excello Developers (Sri Lanka). The visual language is an
editorial, Mediterranean-luxury style: light serif display type, small letter-spaced sans
labels, warm sand and charcoal palette, and scroll-driven motion built with GSAP.

## Run it

Open `index.html` in a browser, or serve the folder:

```
npx serve .
# or
python3 -m http.server 8080
```

No build step. Everything is plain HTML, CSS and vanilla JS.

## Structure

```
index.html        Home: hero, manifesto, services, horizontal projects, stats, process, Aathavan spotlight, CTA
about.html        Story, integrated model, values, leadership
services.html     Five service sections with anchors (#architecture, #construction, #interiors, #real-estate, #branding)
projects.html     Editorial project grid
contact.html      Contact details, enquiry form (front-end only), map placeholder
css/style.css     All styles (design tokens at the top of the file)
js/layout.js      Shared header, fullscreen menu, preloader, cursor and footer markup
js/main.js        Motion system (see below)
js/vendor/        gsap, ScrollTrigger, SplitText (GSAP 3.15, free licence), lenis
```

## Motion system (GSAP + ScrollTrigger + Lenis)

| Hook | Effect |
| --- | --- |
| Preloader | Counter 0 to 100, wordmark reveal, curtain wipe (shown once per browser session) |
| `.hero` | Background scale-in on load, parallax on scroll, content drifts and fades |
| `data-split` | Headline lines slide up out of a mask when scrolled into view |
| `data-split="words-scrub"` | Manifesto words brighten as you scroll through the paragraph |
| `data-reveal` | Fade-up on enter |
| `.media--parallax` + `data-parallax="10"` | Image parallax, number = strength in percent |
| `.media--clip` | Clip-path reveal with a slow zoom-out |
| `.hscroll` | Pinned horizontal scroll gallery with progress bar (stacks vertically under 900px) |
| `data-count` | Number counters |
| `data-theme="dark"` | Page background and text cross-fade to dark while the section is in view |
| `.marquee` | Infinite marquee that speeds up with scroll velocity |
| `.process` | Sticky image that swaps as each step scrolls past |
| `.service` | Floating preview image that follows the cursor over the services list |
| `data-magnetic` | Magnetic pull on buttons and nav links |
| `data-cursor="view"` | Cursor grows into a "View" badge over project cards |
| Footer | Slides up from beneath the page, wordmark letters rise in |
| Links | Curtain page transition between internal pages |

All motion is disabled automatically for `prefers-reduced-motion`.

## Swapping content

* **Images** are Unsplash placeholders. Replace the `src` URLs in the HTML (a failed placeholder falls
  back to picsum.photos automatically). Put local images in `img/` and reference them relatively.
* **Fonts** load from Google Fonts (Cormorant Garamond + Manrope). Change the `<link>` in each page
  `<head>` and the `--font-serif` / `--font-sans` tokens in `css/style.css`.
* **Colours** are CSS custom properties at the top of `css/style.css`.
* **Header, footer, menu** text lives in `js/layout.js`.
* **Contact form** is front-end only. Point it at your form handler (Formspree, Netlify Forms,
  a PHP mailer, etc.) by giving the `<form>` an `action` and removing the demo handler at the
  bottom of `js/main.js`.
* The email `inquiry@excello.lk` and phone `+94 77 022 2000` are taken from the live Excello site.
  Confirm they are current before launch.

---

## Update: scroll-scrubbed video frames, symmetry pass, fixed motif

Two supplied videos were converted to still-frame sequences and are now scrubbed by scroll
(the frame advances as you scroll, forward and back), the way a cinematic site plays a video
on the scrollbar.

### The frame sequences

| Sequence | Source | Frames | Resolution | Folder |
| --- | --- | --- | --- | --- |
| Hero (architectural transformation) | 10s / 24fps clip | 72 | 1920×1080 (original) | `img/hero-seq/` |
| Cinematic band (from foundation to finish) | 12.1s / 30fps clip | 60 | 1920×1080 (original) | `img/clip-seq/` |

Frames were extracted at original resolution with ffmpeg:

```
ffmpeg -i hero.mp4 -vf "fps=72/10" -q:v 6 -frames:v 72 img/hero-seq/f_%03d.jpg
ffmpeg -i clip.mp4 -vf "fps=60/12.1" -q:v 6 -frames:v 60 img/clip-seq/f_%03d.jpg
```

The two sequences are about 33 MB together, so the whole page preloads that before the scrub is
fully smooth. **To make it lighter** for a live site, re-run the commands above with either a lower
frame count (e.g. `fps=48/10`) or a smaller width (add `-vf "scale=1280:-2,fps=..."`). The player
reads the frame count from the HTML, so also update `data-frames` on the section.

### How the player works (`js/main.js`)

Any element with `data-seq="<folder>" data-frames="<n>"` and a child `<canvas>` becomes a pinned,
scroll-scrubbed scene:

- Frames load progressively; a small `Loading NN%` counter shows until they are all in.
- The current frame is drawn to a canvas with cover-fit math, redrawn on resize and on GSAP refresh.
- A pinned `ScrollTrigger` maps scroll progress to the frame index. `data-seq-end` sets how much
  scroll the scene takes (e.g. `+=150%`).
- `data-seq-mode="hero"` also fades the hero text out toward the end of the pin.
- Under `prefers-reduced-motion` the scene is not pinned; it just shows the first frame.

To swap in different footage, replace the JPEGs in the folder (named `f_001.jpg`, `f_002.jpg`, …)
and set `data-frames` to the new count.

### Symmetry pass

- The horizontal project gallery panels are now all the same width with the same 4:5 image ratio,
  so their tops and bottoms line up instead of stepping up and down.
- The feature block below the manifesto is now a balanced two-up diptych (equal columns, aligned
  tops) with a single lead line above it.

### The fixed motif

The horizontal-slide section has a fixed line-drawn sun/arc motif (an inline SVG in `index.html`,
`.hscroll__motif`) that stays put while the panels slide across it — a nod to Aathavan's
solar theme. It is drawn with the bronze accent and is easy to replace: swap the inline `<svg>`
for your own artwork. (The white image supplied for this was effectively blank, so this motif was
drawn in its place; drop your SVG in if you have final art.)

### Parallax images

The parallax blocks still use cloud-hosted (Unsplash) images; a couple were refreshed to larger
crops. Replace those `src` URLs with your own photography when ready.

---

## Update: cloud environment + universal parallax

- **Cloud environment** (`.sky` section, after the horizontal gallery). A warm sky gradient with a
  soft bronze sun glow and six blurred cloud layers that drift at different speeds as you scroll
  (parallax depth). Cloud colour is a single token, `--cloud` on `.sky`, and the sun/gradient use
  the site's sand/bronze palette, so it already matches; change `--cloud` to retint.
- **Universal parallax.** Every section now has parallax motion: decorative layers use
  `data-py` / `data-px` (drift amount in percent, relative to their `[data-parallax-root]`), and a
  gentle automatic parallax is applied to section headings, stats, values, specs, cards, quotes and
  list blocks across all pages. Pinned scenes (hero, gallery, sequences) and the sky keep their own
  motion and are skipped. All of it is disabled under `prefers-reduced-motion`.

Original-resolution frames (1920×1080) are kept in the repository. Download the full bundle from the
branch rather than the chat attachment, which is size-limited.

---

## Update: full-frame scrub, section overlap, smoother Lenis, more motion

- **Every frame, high fps.** Both videos are now extracted at their native frame rate and original
  1920×1080 resolution: hero 240 frames (24 fps × 10s), band 363 frames (30 fps × 12.1s), about
  150 MB of stills. The scrub is buttery because no frames are skipped. If that is too heavy for a
  live host, re-extract with a lower `fps=` and update `data-frames` in `index.html`.
- **Section overlap.** The cinematic band is now `position: sticky` inside a `.stack`, and the stats
  panel (`[data-overlap]`, opaque background, soft top shadow) rises up and over it as you scroll,
  so the lower section comes over the upper one.
- **Smoother scrolling.** Lenis is tuned lower and softer (`lerp: 0.06`, exponential easing, touch
  sync) for a more gliding feel that the frame scrub rides on.
- **Less empty space.** Section padding and heading margins were trimmed site-wide.
- **More GSAP.** Every image now has a GSAP reveal (fade plus slow scale-out) and body copy, leads
  and labels animate in on scroll, on top of the split-line heading animations.

### Downloading the full-resolution build

Because the full-frame set is ~150 MB, the repository no longer carries a committed `.zip`
(GitHub rejects single files over 100 MB). Download the whole branch as a ZIP instead:

- **Download ZIP:** https://codeload.github.com/sameera-gamage/Web/zip/refs/heads/claude/website-clone-gsap-animations-zxupx1
- Or on the branch page, use the green **Code → Download ZIP** button.

---

## Update: new upscaled hero video + advanced preloader

- **New hero sequence.** The supplied 30s / 1280×720 clip is now the hero. Every frame (720 at
  24 fps) was extracted and **upscaled to 1920×1080** with a Lanczos scaler plus light sharpening:

  ```
  ffmpeg -i hero.mp4 -vf "scale=1920:1080:flags=lanczos,unsharp=5:5:0.8:5:5:0.0" -q:v 6 img/hero-seq/f_%03d.jpg
  ```

  It scrubs on Lenis smooth scroll through a long pinned hero (`data-seq-end="+=300%"`), so all 720
  frames get room to play smoothly. `img/hero-seq/` is ~103 MB.
- **Advanced preloader.** Rebuilt as a real loading screen tied to actual hero-frame downloads
  (`window.__heroReady`), not a fixed timer: a top wordmark row, the EXCELLO logotype rising in,
  a cycling discipline word (Architecture → Construction → …), a real progress bar and a large
  percentage counter that eases to 100 as the first frames arrive, then a curtain wipe reveals the
  hero. It falls back to a timed fill on pages without the hero, and is skipped under
  `prefers-reduced-motion` and on repeat visits in the same tab.

The full build is now ~200 MB of frames; download the branch ZIP rather than a committed file.

---

## Update: full editorial redesign (everything below the hero)

The hero is unchanged. Everything else moved to a distinctive, premium editorial system.

- **New type system.** Display set in **Fraunces** (an optical serif with real character and gorgeous
  italics) and UI/body in **Archivo** (an architectural grotesque), replacing the earlier
  Cormorant/Manrope pairing. Tokens `--font-serif` / `--font-sans` in `css/style.css`.
- **Refined palette.** Deeper ink, warmer paper, a more restrained bronze accent.
- **Editorial details.** Section heads now carry a hairline rule that draws in on scroll with an
  index label; the services list uses oversized Fraunces titles with italic index numbers; the stats
  are monumental Fraunces numerals; the marquee alternates solid italic and outline (stroked) words;
  the closing call-to-action sets one word as an outline accent.
- **Premium finish.** A fine film-grain overlay for tactile depth and a slim bronze scroll-progress
  bar at the top of the viewport.

All of this is layered in `css/style.css` (see the "REDESIGN" addendum) plus small additions to
`js/main.js`; the HTML structure is unchanged, so the animations and sequences all still apply.

---

## Update: richer motion + redesign pass 2

- **Image reveals.** Every content image (except the hero, sequences and sky) now reveals with a
  dark cover panel that wipes upward while the image settles from a slow zoom, instead of the plain
  clip fade.
- **Text reveals.** Section headings animate character by character inside masked lines; lead
  paragraphs rise word by word; body copy, labels and list items fade up. The hero heading keeps its
  original line reveal, unchanged.
- **Projects** gallery gained an editorial numbered index with a hairline meta rule and hover shift.
- **Contact** form was restyled premium: large serif fields with an animated focus underline.
- **Services / About** rows, value cards and spec cells got hover and polish passes.

Footer and hero are unchanged.
