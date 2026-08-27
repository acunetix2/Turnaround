# Turnaround — Visual Design Spec (Design Tokens + UI Patterns)

Reference products: **Samsara** (fleet/logistics category leader — closest domain match) and **Flexport** (clean, photography-confident supply-chain platform). Styling direction: **solid, high-contrast surfaces — no glassmorphism, no blur.** Clean and premium comes from typography, spacing, and real photography, not translucency effects.

This spec is meant to be handed directly to the frontend build agent alongside `turnaround-frontend-agent-prompt.md`. It defines *how things look*; the other doc defines *what gets built*.

---

## 1. Design Principles (in priority order)

1. **Cost and severity lead, position is secondary.** Samsara's UI treats location as the hero (it's a tracker). Turnaround must treat *excess time and money* as the hero — the biggest, warmest-toned numbers on any screen should be financial impact and delay severity, not GPS coordinates.
2. **Solid surfaces, sharp edges, no blur.** Cards, panels, and popovers use flat opaque backgrounds with a thin 1px border and a soft drop shadow for elevation — never `backdrop-filter`/frosted transparency. This keeps every number maximally legible at a glance, which matters more here than in a consumer app.
3. **Real photography grounds the data.** Every location and vehicle should feel like a real place/asset (warehouse yard, depot, highway, truck), not an icon. Photography lives in dedicated image slots — full-bleed hero banners, card thumbnails — with a solid gradient scrim under any overlaid text, not a blur.
4. **Color is meaning, not decoration.** Green/amber/red are reserved exclusively for on-time / at-risk / delayed states. Nothing else in the UI uses these hues.

---

## 2. Color Tokens

Dark mode is the primary theme (operations dashboards live on wall displays / are used for long stretches — dark reduces glare and matches the reference doc's own aesthetic).

```css
:root[data-theme="dark"] {
  /* Surfaces — solid, opaque, no transparency */
  --bg-canvas: #0A0B0D;          /* app background */
  --bg-surface: #121317;          /* cards, panels */
  --bg-surface-raised: #1A1C21;   /* elevated cards, popovers, modals */
  --border-default: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);

  /* Elevation (shadow, not blur, creates depth) */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.24);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.32);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.40);

  /* Text */
  --text-primary: #F4F5F7;
  --text-secondary: #9CA3AF;
  --text-tertiary: #6B7280;

  /* Brand */
  --brand-500: #4F7CFF;   /* primary actions, links, focus rings */
  --brand-400: #6E92FF;

  /* Status — the only saturated colors in the system */
  --status-good: #22C55E;      /* on-time / within expected dwell */
  --status-good-bg: rgba(34, 197, 94, 0.12);
  --status-warning: #F5A524;   /* medium excess delay */
  --status-warning-bg: rgba(245, 165, 36, 0.12);
  --status-danger: #F0464C;    /* high excess delay / severe insight */
  --status-danger-bg: rgba(240, 70, 76, 0.14);

  /* Financial emphasis (distinct from status danger — money isn't automatically "bad") */
  --money-accent: #FFB020;     /* used only for cost figures */

  /* Chart palette (Recharts) — desaturated, sequential, colorblind-checked */
  --chart-1: #4F7CFF;
  --chart-2: #22C55E;
  --chart-3: #F5A524;
  --chart-4: #F0464C;
  --chart-5: #9C6ADE;
}
```

Light mode: invert surfaces to `#FFFFFF` / `#F7F8FA` / `#EEF0F3`, keep the same status/brand hues (test contrast — status colors may need +5–8% saturation on light backgrounds to hold the same visual weight).

---

## 3. Typography

```css
--font-ui: "Inter", -apple-system, sans-serif;         /* all UI text, labels, nav */
--font-numeric: "IBM Plex Mono", "JetBrains Mono", monospace; /* dwell times, costs, coordinates, IDs */

--text-xs:   12px / 16px;
--text-sm:   13px / 18px;
--text-base: 14px / 20px;
--text-lg:   16px / 24px;
--text-xl:   20px / 28px;
--text-2xl:  28px / 34px;   /* hero KPI numbers */
--text-3xl:  36px / 42px;   /* dashboard's single biggest figure — financial impact */
```

Rule: **any number representing time, money, or an ID uses `--font-numeric`.** This single choice is what makes the UI feel like Samsara/operational software rather than a marketing site — tabular figures should visually read as data, not prose. Everything else (nav, labels, body copy, recommendations) uses `--font-ui`.

---

## 4. Spacing & Radius

```css
--space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
--space-5: 24px; --space-6: 32px; --space-8: 48px; --space-10: 64px;

--radius-sm: 8px;    /* inputs, badges */
--radius-md: 12px;   /* standard cards */
--radius-lg: 20px;   /* glass hero panels, modals */
--radius-full: 999px; /* status pills, avatars */
```

Grid: 12-column, 24px gutter, max content width 1440px, sidebar fixed 240px (64px collapsed).

---

## 5. The Elevated Panel (component spec)

Use for: dashboard hero KPI strip, map marker popovers, vehicle/location quick-view cards, command palette / search, modals.
Same use-cases glass would have covered — but built as a solid, opaque surface so it stays fully legible over any background, including photography.

```css
.panel-elevated {
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
```

When an elevated panel sits on top of a photo (e.g. the dashboard hero), it does not float translucently over it — it sits in a dedicated solid-color zone below or beside the image, separated by a hard edge or a short solid-color gradient scrim (`linear-gradient(180deg, transparent 0%, var(--bg-canvas) 100%)`), never overlapping the photo with reduced opacity. This keeps text at full contrast at all times.

---

## 6. Photography Usage

| Where | Treatment |
|---|---|
| Dashboard hero (top of page, above the KPI strip) | Full-bleed photo (truck at loading dock / warehouse yard at dusk) in its own banner zone, `linear-gradient(180deg, rgba(10,11,13,0.15) 0%, rgba(10,11,13,0.9) 100%)` scrim so any overlaid title text stays fully legible; the KPI strip itself sits below in a solid `--bg-surface` panel, not on the photo |
| Location cards (list + detail) | 16:9 thumbnail matching `location_type` (warehouse, port, depot, border crossing, customer facility) — use a small curated stock set per type, not per-record, unless the user has uploaded a real photo of that site |
| Vehicle detail page | Optional truck photo by `vehicle_type`; not required on list rows (keep list rows dense/text-first, matching Samsara's table density) |
| Insight cards, tables, forms | No photography — these need maximum legibility, not atmosphere |

Source real images via stock (Unsplash-quality, warehouse/logistics/highway categories) — never AI-generated vehicle imagery that could misrepresent real equipment.

---

## 7. Status & Severity Pattern (borrowed + sharpened from Samsara)

Never color-only. Every status is icon + label + color together.

```
● On Time         --status-good      (dot + label, e.g. dwell within expected)
▲ At Risk         --status-warning   (excess 1.0x–1.5x expected — matches backend MEDIUM)
■ Delayed         --status-danger    (excess >1.5x expected — matches backend HIGH)
```

Severity badges are pill-shaped (`--radius-full`), `--text-sm`, solid background = the `-bg` token (12–14% opacity over `--bg-surface`, no transparency to what's behind the card), text/icon = the full-saturation token — this is the exact technique that keeps Samsara's alert states readable without turning the whole UI red.

Financial figures get their own visual channel (`--money-accent`), independent of status — a large cost figure isn't automatically "danger" styled; let the number and the `KES` label carry weight via size/weight, not alarm color, so `--status-danger` stays reserved for genuinely severe delays.

---

## 8. Page-Specific Application

**Dashboard** — full-bleed photo banner up top (dimmed via scrim, per §6) with the page title, directly followed by a solid `--bg-surface` KPI strip (`panel-elevated`, §5) containing Active Trucks / Trucks Delayed / Excess Dwell Today / **Estimated Financial Impact (largest, `--text-3xl`, `--money-accent`, `--font-numeric`)** / Top Bottleneck / Avg Excess Delay. Below the fold: solid cards for trend charts and the bottleneck ranking table — same surface treatment throughout, no visual tier change.

**Live Fleet Map** — full-screen Mapbox, dark custom style (desaturated, low-label-density basemap — match Samsara's map skin, not default Mapbox streets). Geofences: thin 1px outline, `--brand-500` at low opacity, fill only on hover. Vehicle markers: neutral dot when on-time, pulsing `--status-danger` marker when delayed. Click → solid `panel-elevated` popover (per §5) with truck reg, location, elapsed vs expected dwell, and a "View Insight" link if one exists.

**Vehicles / Locations lists** — dense solid-surface tables (Samsara-style row density), photography only on the detail page header, not in list rows.

**Insights** — solid cards, severity badge top-left, financial impact top-right in `--money-accent` + `--font-numeric`, recommendation text visually distinct (e.g. left border accent + slightly muted background) so it reads as "the action," not just more description.

**Analytics** — chart palette from §2, dark chart backgrounds matching `--bg-surface`, gridlines at 6% white opacity, tooltips as solid `--bg-surface-raised` panels with `--shadow-md`.

---

## 9. Motion

Keep minimal and functional, not decorative — this reinforces the "serious operational tool" feel:
- Elevated panels/popovers: fade + 4px translate-up on mount, 150ms ease-out.
- Status changes (e.g. a truck flips to Delayed): color transition 200ms, no bounce.
- No parallax, no scroll-jacking, no confetti/celebration animations anywhere — this is an ops tool, not a consumer app.

---

## 10. Deliverable for the Frontend Agent

Implement §2–§4 as a Tailwind theme extension (`tailwind.config.ts` `theme.extend`) and a `.panel-elevated` utility class per §5, before building any page. Every component in `components/ui/`, `components/charts/`, and `components/map/` must consume these tokens — no hardcoded hex values, no `backdrop-filter`/blur anywhere in the codebase, and no inline pixel spacing anywhere in `features/`.
