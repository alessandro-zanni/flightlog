---
name: Flightlog
description: A personal flight history set as an airport's own sign system.
colors:
  sign: "#ffcc00"
  sign-deep: "#e6b800"
  ink: "#0b0b0b"
  panel: "#1a1a1a"
  panel-line: "#333333"
  muted: "#4a4a4a"
  muted-dark: "#b5b5b5"
  rule: "#e6e6e6"
  alert: "#c8102e"
  ground: "#ffffff"
typography:
  display:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  figure:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.556
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.429
rounded:
  none: "0px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  bar: "56px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "14px 16px"
  button-primary-hover:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.ink}"
  button-add:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sign}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "6px 12px"
  button-add-hover:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.ink}"
  button-delete:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.alert}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
  button-delete-confirm:
    backgroundColor: "{colors.alert}"
    textColor: "{colors.ground}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
  input-field:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  top-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    height: "{spacing.bar}"
    padding: "0 16px"
  sign-band:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    padding: "16px"
  sign-band-hover:
    backgroundColor: "{colors.sign-deep}"
  plate:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    size: "56px"
  list-row:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    padding: "12px 16px"
  list-row-hover:
    backgroundColor: "{colors.sign}"
  section-sign:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    padding: "8px 16px"
---

# Design System: Flightlog

## Overview

**Creative North Star: "The Overhead Sign"**

Flightlog is set the way an international airport sets its wayfinding: flat black sign panels hung over a white reading ground, with one colour, airport yellow, reserved for the thing you are walking toward. The next flight is a single yellow overhead band; the history below it reads like a concourse of black section signs with ruled rows beneath. Nothing floats, nothing is rounded, nothing glows, except the globe, the one lit object in the system. Hierarchy comes from scale and contrast alone: IATA codes and figures set at monumental size in a heavy humanist grotesk, everything else in calm sentence case.

The world is warm rather than technical. Hanken Grotesk is a humanist sans, not a monospace or a condensed departures-board face; pictograms are solid white shapes on black inset plates, the way real terminal signage draws them. The map is a dark 3D globe hung in a sign-black field, where routes arc in yellow and airports are white points, and it shares the yellow with the list: hovering or focusing a row turns the globe to that row's route, lights it and dims the rest.

Density is that of a sign, not a dashboard: few elements, very large, with a fixed 16px gutter. On a phone everything stacks; on a wide screen the map and figure directory hold a sticky left column while the list runs beside them.

**Key Characteristics:**
- One yellow, reserved for wayfinding: the next-flight band, the primary hover state, the lit route.
- Flat black sign panels and a white reading ground; the scheme never inverts.
- Hard square edges everywhere; no radius, no drop shadows.
- Monumental heavy codes and figures in tabular numerals; sentence case for all prose.
- Solid white pictograms on black inset plates; arrows locked to the edge they point past.

## Colors

A signage palette: one saturated wayfinding yellow, a sign-black family, a white ground, and one alarm red.

### Primary
- **Airport Yellow** (sign): the wayfinding colour. The next-flight band, the background of a hovered or focused list row, the routes on the map, the Add outline in the top bar, the focus outline, text selection, and the "upcoming" section sign's label.
- **Pressed Yellow** (sign-deep): the hover state of the yellow band only; a slightly deeper yellow so the band reads as pressed without leaving the colour.

### Tertiary
- **Signal Red** (alert): destructive and error states only. The outlined Delete control, its filled confirm button, and the outlined error message above a form.

### Neutral
- **Sign Black** (ink): top bar, footer, section signs, pictogram plates, map field, figure directory, primary button, input borders, and all body text on white.
- **Panel Black** (panel): the globe's ocean, one step above the sign-black field; land sits one step higher in panel-line grey.
- **Panel Line** (panel-line): the hairlines that rule the figure directory into gate cells on black.
- **Ground White** (ground): the reading ground for lists and forms, and text on black panels. Currently hardcoded in the body rule rather than declared as a theme token.
- **Muted Grey** (muted): secondary text on white (dates, city pairs, the "optional" hint, placeholders, the delete warning) and the dimmed routes on a single-flight map.
- **Light Grey Label** (muted-dark): secondary text on black (figure labels, the sign-out link).
- **Rule Grey** (rule): row dividers, the wide-screen column divider, and the rule above the delete disclosure.

### Named Rules
**The One Live Sign Rule.** Yellow marks wayfinding and nothing else: where you go next, what you are pointing at, the route that is lit. It never decorates, never fills a static card, never becomes a brand wash across a page.

**The Signs Don't Invert Rule.** The colour scheme is light only (`color-scheme: light`). Black lives on sign panels, white is the reading ground; there is no dark mode.

**The Red Means Loss Rule.** Signal red appears only where data is lost or an action failed.

## Typography

**Display Font:** Hanken Grotesk (with ui-sans-serif, system-ui, sans-serif), loaded through next/font.
**Body Font:** Hanken Grotesk, same stack.

**Character:** A single humanist grotesk carries the whole system across three weights (400, 600, 800). Monumental extra-bold codes and figures against regular-weight prose give the contrast of a terminal sign without the coldness of a condensed or monospace face.

### Hierarchy
- **Display** (800, 3.5rem on phone, 4.5rem from 640px, line-height 1, tracking -0.025em): the destination IATA code in the next-flight band.
- **Figure** (800, 3rem on phone, 3.5rem from 640px, line-height 1, tracking -0.025em): totals in the figure directory, set like gate numbers with their label on the same baseline.
- **Headline** (800, 2.25rem to 3rem, line-height 1, tracking -0.025em): the route or page title in the band on the flight pages; the wordmark on login (3rem).
- **Title** (600, 1.125rem): band detail lines, figure labels, buttons, form input text.
- **Body** (400, 1rem, line-height 1.5): list cells, prose, warnings. Route codes inside a row step up to 800.
- **Label** (600, 0.875rem): form labels, the Add control, list secondary lines (at 400 in muted grey).

### Named Rules
**The Tabular Rule.** Numerals are tabular everywhere (`font-variant-numeric: tabular-nums` on body), so figures, dates and flight numbers align in their columns.

**The Sentence Case Rule.** Everything is set in sentence case. Uppercase is reserved for data that is uppercase by nature: IATA codes, flight numbers, booking codes, and the inputs that hold them.

**The Drawn Arrow Rule.** Route arrows are a drawn SVG pictogram sized to the text (0.8em), never a typed arrow character; screen readers hear the localised "to" instead.

## Layout

Phone first at 390px, one column. A 56px black top bar carries the wordmark left and Add right; the next-flight band follows and sticks to the top while scrolling. The map runs full width, then a two-column figure directory, then the list grouped under black section signs (upcoming, then one sign per year).

A single 16px horizontal gutter is used by every band, bar, row and section sign; vertical rhythm is 8 to 16px inside sign elements (8px section signs, 10px figure cells, 12px rows, 16px band). Forms sit in a 2-column grid with 12px column and 16px row gaps, centred at up to 64rem; login narrows to 24rem.

From 1024px the home page splits into two equal columns: map and figure directory stacked in a sticky left column (pinned under the band), the list beside them behind a rule-grey divider, so a hovered row's route stays in view. Flight pages split form and map side by side at the same breakpoint.

**The Fixed Columns Rule.** List rows are a fixed grid (date, route, airline; plus flight number and booking code from 640px). Columns never reflow or wrap; on narrow screens they drop by priority.

**The Locked Arrow Rule.** On a band, the direction arrow sits on its own plate at the far edge it points past, mirroring the pictogram plate at the opposite edge.

## Elevation & Depth

The system is flat. There are no drop shadows and no tonal elevation; depth is replaced by contrast between black sign panels and the white ground, and by stickiness (the band and the wide-screen map column pin in place rather than lifting). The single box-shadow in the system is part of the focus indicator, a solid 5px ink halo outside a 3px yellow outline, so focus reads on both yellow and black surfaces.

**The Flat Sign Rule.** Panels are flat signs with hard edges. State is shown by colour change (row to yellow, button to yellow, band to pressed yellow), never by lift or shadow. The globe is the declared exception: a lit sphere with a faint white atmosphere, contained in its own black field, so the depth stays in the map and never leaks into the UI.

## Shapes

Every panel, button, input, plate and message has square corners (0px). Borders are heavy and solid when they mark a control (2px ink on inputs, 2px yellow on Add, 2px red on Delete and errors) and 1px when they rule content (row dividers, directory cells). Pictogram plates are exact squares (56px, 72px in the band from 640px; 32px for the wordmark's white plate). The only curves are cartographic: the globe, its arcing routes and its round airport points belong to the map's own drawing, not to the UI.

## Components

### Buttons
Blunt and tactile; colour flips instead of motion.
- **Shape:** square corners (0px).
- **Primary:** sign-black fill, white 1.125rem semibold label with a drawn arrow, full width of its form, 14px by 16px padding.
- **Hover / Focus:** fill turns airport yellow and text turns black; focus adds the yellow outline with ink halo.
- **Add (top bar):** 2px yellow outline with yellow label and plus pictogram on black; fills yellow with black text on hover.
- **Destructive:** Delete is a red-outlined disclosure summary that fills red on hover; opening it reveals a muted warning and a red-filled confirm button that turns black on hover.

### Cards / Containers
There are no cards. Content sits either on a full-bleed black sign panel (top bar, section signs, figure directory, map) or on the white ground divided by 1px rule-grey lines.

### Inputs / Fields
- **Style:** 2px sign-black border, white fill, 0px radius, 10px by 12px padding, 1.125rem text; ink caret; muted-grey placeholder.
- **Labels:** 0.875rem semibold above the field; optional fields carry a regular-weight muted "(optional)" hint.
- **Focus:** the global yellow outline with ink halo.
- **Error:** a 2px red-outlined message in red semibold text at the top of the form, announced as an alert.

### Navigation
A 56px sign-black top bar. Home carries the wordmark (white plane plate plus extra-bold name) and the Add control; flight pages carry a single back link (reversed arrow plus label) that turns yellow on hover. A black footer holds the sign-out link in light grey, turning white on hover.

### Sign Band (signature)
The one live sign. A full-bleed yellow band: pictogram plate left, the destination code at display size with city, weekday date, airline and an extra-bold countdown beneath, and the arrow plate locked to the right edge. The whole band is a link and deepens to pressed yellow on hover. On flight pages and login the same band carries the route or wordmark at headline size, without the arrow plate.

### Pictogram Plate
A black inset square holding a solid white pictogram (plane, arrow) drawn on a 24-unit grid. Pictograms are solid shapes, not outline icons; stroked arrows and the plus use a 3px square-capped stroke.

### Figure Directory
A two-column grid on sign black, each cell ruled by panel-line hairlines like gate cells: the figure at monumental size, its light-grey label on the same baseline.

### Flight List Row
A fixed-column row on white with a rule-grey divider: muted date, extra-bold route codes with the drawn arrow over a muted city pair, airline, then flight number and booking code on wider screens. Hover or focus turns the row yellow and lights its route on the map (stroke to full opacity and 5px) while every other route dims to 20% opacity over 200ms.

### Section Sign
A full-bleed black strip with an extra-bold label: white for each year, yellow for the upcoming group.

### Route Map
A WebGL globe (react-globe.gl) on a sign-black field: panel-black ocean, panel-line land outlined in ink, a faint white atmosphere (never yellow), yellow routes arcing off the surface and white airport points. Hovering an airport shows its IATA code on a small black plate. Drag turns it with inertia, pinch or wheel zooms. Route width scales with the camera so routes stay hairlines up close.

- **Arrival** (the one authored moment): the whole planet first, then a 1.4s flight down to the part of it actually flown.
- **Row hover:** the globe turns to the route in 700ms, lights it and dims the rest to 20%; 400ms after the pointer leaves the list it turns back home.
- **Flight page:** framed on the current route, drawn yellow, the others in muted grey.
- **Fallback:** the flat SVG map (Natural Earth, framed to the flown airports) renders first and stays when there is no WebGL; the globe fades in over it.
- **Reduced motion:** no arrival, no inertia, instant turns; the colour change of the lit route stays.

## Do's and Don'ts

### Do:
- **Do** reserve airport yellow for the next flight, the primary hover state, and the lit route.
- **Do** set IATA codes and totals at monumental extra-bold size with tight tracking and tabular numerals.
- **Do** put pictograms on black inset plates, drawn as solid white SVG shapes.
- **Do** lock a direction arrow to the edge of the band it points past.
- **Do** keep list columns fixed and drop them by priority on narrow screens.
- **Do** keep Delete alone at the foot of the edit page, outlined in red, behind a disclosure and a second confirm.
- **Do** use the 16px gutter on every bar, band, row and section sign.

### Don't:
- **Don't** round corners on panels, buttons, inputs or plates.
- **Don't** add drop shadows or lift on hover; change colour instead.
- **Don't** use yellow as decoration, a static fill, or a brand wash.
- **Don't** add a dark mode or invert the scheme; signs don't invert at night.
- **Don't** ring the globe with separate stat tiles; figures sit in one ruled directory below it, and the globe opens on the flown world, not the whole planet.
- **Don't** set prose in uppercase or use a condensed or monospace departures-board face.
- **Don't** type arrow characters into routes; use the drawn arrow pictogram.
