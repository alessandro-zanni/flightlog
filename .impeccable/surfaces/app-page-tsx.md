---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/login/page.tsx"]
---

# Surface brief: Flightlog app (home, flight edit pages, login)

Scope: `/` (home), `/flights/new`, `/flights/[id]`, `/login`. Mode: Operate. Phone first, desktop as wide.

Job: glance at the next flight and the history; show the map with pride; correct a flight on its own page.
Constraints: bilingual (en/it from the browser), dates and numbers by locale. Not an airline app, not a SaaS dashboard, not cold or technical (user, 2026-10-29). Delete always confirms.

## Direction contract

THESIS: Flightlog as an airport's own sign system: the next flight hangs as one yellow overhead band, the history reads like a concourse of black signs. Refuses the dark-globe-plus-stat-tiles arrangement of every flight app.

OWN-WORLD: Schiphol yellow (#FFCC00) reserved for wayfinding only: the next-flight band, the primary action, the selected route. Sign-black shell and map field, white pictograms on black inset squares, white page ground for reading. Humanist sans (Hanken Grotesk) in sentence case; IATA codes and figures at monumental scale; arrows locked to the edge they point past. No rounded cards, no shadows: panels are flat signs with hard edges.

STORY: He sees where he goes next, then where he has been; he hands the phone across the table on the map; he fixes a wrong flight by opening its page, never by hunting.

FIRST VIEWPORT: Phone 390: black top bar (wordmark left, yellow-outlined Add right). When a flight is upcoming: yellow band, black pictogram square, destination code at 56px with arrow, city, weekday date, airline, countdown. Without one, the map leads. Map full width on sign black, routes in yellow, airports white. Below, figures as gate numbers in a ruled grid (flights, km, hours, airports, countries, airlines), then the list in fixed columns. Desktop: map and figure directory stacked in a sticky left column, the list beside them; this keeps "then where he has been" in the first viewport and keeps the map in view while hovering rows lights their routes (revised 2026-10-29 after the finish review).

FORM: Terminal Signage, catalog challenger chosen over the assigned Swiss route poster. seed:8551234b752de709. Signature move: the yellow band as the one live sign; hovering or focusing a list row lights its route yellow on the map. Kept disciplines: delete stands alone, outlined, at the foot of the edit page; list columns never reflow, they drop by priority.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
