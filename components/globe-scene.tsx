"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { ArcLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { LngLatBounds, Map as MapLibre, Popup, setWorkerUrl, type SkySpecification } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

// MapLibre looks for its worker next to its own module, which the bundler moves: point it at the emitted file.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

type Point = { lat: number; lon: number };
export type GlobeRoute = { key: string; from: Point; to: Point };
export type GlobeAirport = Point & { code: string };

// Free CARTO vector tiles (OSM data), recoloured to the sign system: ocean in panel black, land a step above.
const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CARTO_LAND = "#0e0e0e";
const CARTO_WATER = "#2C353C";
const LAND = "#333333";
const OCEAN = "#1a1a1a";

// A faint halo around the globe, gone once zoomed into the street map; no sky colour behind it.
const SKY: SkySpecification = {
  "sky-color": "transparent",
  "horizon-color": "transparent",
  "fog-color": "transparent",
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.35, 5, 0.35, 7, 0],
};

// Yellow only marks routes (DESIGN.md).
type RGBA = [number, number, number, number];
const SIGN: RGBA = [255, 204, 0, 255];
const DIM: RGBA = [255, 204, 0, 51];
const MUTED: RGBA = [106, 106, 106, 255];
// Arc height as a share of the route's length: long hauls climb higher.
const ARC_HEIGHT = 0.3;

const ARRIVAL_MS = 1400;
const FLY_MS = 700;
const RETURN_DELAY_MS = 400;
const PADDING = 40;
const MAX_ZOOM = 5;

const boundsOf = (points: Point[]) =>
  points.reduce((b, p) => b.extend([p.lon, p.lat]), new LngLatBounds());

// One route lit, the rest muted (flight page) or dimmed under the pointer (list hover); the lit one drawn last.
function routeArcs(routes: GlobeRoute[], lit: string | undefined, dimmed: boolean) {
  const color = (r: GlobeRoute) => {
    if (!lit || r.key === lit) return SIGN;
    return dimmed ? DIM : MUTED;
  };
  return new ArcLayer<GlobeRoute, { beforeId: string }>({
    id: "routes",
    // Under the airport points, which stay MapLibre circles.
    beforeId: "airports",
    data: routes.toSorted((a, b) => Number(a.key === lit) - Number(b.key === lit)),
    greatCircle: true,
    getSourcePosition: (r) => [r.from.lon, r.from.lat],
    getTargetPosition: (r) => [r.to.lon, r.to.lat],
    getSourceColor: color,
    getTargetColor: color,
    getWidth: (r) => (r.key === lit ? 3 : 1.5),
    getHeight: ARC_HEIGHT,
    // MapLibre's context has no multisampling, so the arcs smooth their own edges.
    antialiasing: true,
    // The globe culls back faces: without this an arc vanishes when seen from its other side.
    parameters: { cullMode: "none" },
  });
}

export default function GlobeScene({
  routes,
  airports,
  highlight,
}: Readonly<{ routes: GlobeRoute[]; airports: GlobeAirport[]; highlight?: string }>) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre>(undefined);
  const overlay = useRef<MapboxOverlay>(undefined);
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<string>();
  const [webgl] = useState(() => !!document.createElement("canvas").getContext("webgl2"));
  const lit = hovered ?? highlight;

  const byKey = useMemo(() => new Map(routes.map((r) => [r.key, r])), [routes]);
  const home = useMemo(() => {
    const route = highlight && byKey.get(highlight);
    return boundsOf(route ? [route.from, route.to] : airports);
  }, [highlight, byKey, airports]);

  // Built in an effect, torn down in its cleanup: when Next hides the page (cacheComponents keeps it in an
  // Activity) the map is removed, and showing the page again builds a fresh one.
  useEffect(() => {
    const el = box.current;
    if (!el || !webgl) return;
    const center = home.getCenter();
    const m = new MapLibre({
      container: el,
      style: STYLE,
      transformStyle: (_, next) => ({
        ...JSON.parse(JSON.stringify(next).replaceAll(CARTO_LAND, LAND).replaceAll(CARTO_WATER, OCEAN)),
        sky: SKY,
      }),
      // The one authored moment: the whole planet first, then the part of it actually flown.
      center: [center.lng - 70, center.lat - 20],
      zoom: 1,
      // Zoomed out, the whole planet still fills the box instead of shrinking to a dot.
      minZoom: 1,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      // On a phone one finger scrolls the page; two move the map.
      cooperativeGestures: matchMedia("(pointer: coarse)").matches,
    });
    m.touchZoomRotate.disableRotation();
    m.keyboard.disableRotation();
    // Routes are deck.gl arcs drawn inside MapLibre's own render pass, so the globe hides the far side.
    const arcs = new MapboxOverlay({ interleaved: true });
    map.current = m;
    overlay.current = arcs;

    m.on("style.load", () => m.setProjection({ type: "globe" }));
    m.on("load", () => {
      m.addSource("airports", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: airports.map((a) => ({
            type: "Feature",
            properties: { code: a.code },
            geometry: { type: "Point", coordinates: [a.lon, a.lat] },
          })),
        },
      });
      m.addLayer({
        id: "airports",
        type: "circle",
        source: "airports",
        paint: { "circle-color": "#ffffff", "circle-radius": 3.5, "circle-stroke-color": "#0b0b0b", "circle-stroke-width": 1 },
      });
      m.addControl(arcs);

      // Hovering an airport shows its code on a small black sign plate.
      const label = new Popup({ closeButton: false, closeOnClick: false, className: "globe-label", offset: 10 });
      m.on("mouseenter", "airports", (e) => {
        const f = e.features?.[0];
        if (f?.geometry.type === "Point") {
          label.setLngLat(f.geometry.coordinates as [number, number]).setText(f.properties.code).addTo(m);
        }
      });
      m.on("mouseleave", "airports", () => label.remove());

      // Reduced motion makes this a jump: MapLibre skips camera animations on its own.
      m.fitBounds(home, { padding: PADDING, maxZoom: MAX_ZOOM, duration: ARRIVAL_MS });
      setReady(true);
    });

    return () => {
      map.current = undefined;
      overlay.current = undefined;
      setReady(false);
      m.remove();
    };
    // ponytail: data changes rebuild the whole map; diff the sources if it ever matters.
  }, [webgl, routes, airports, home]);

  // Light the hovered or current route, the others muted or dimmed.
  useEffect(() => {
    if (ready) overlay.current?.setProps({ layers: [routeArcs(routes, lit, !!hovered)] });
  }, [ready, routes, lit, hovered]);

  // Hovering or focusing a list row turns the globe to that route; leaving the list turns it back home.
  useEffect(() => {
    let current: string | undefined;
    let back: ReturnType<typeof setTimeout>;
    const fly = (b: LngLatBounds) =>
      map.current?.fitBounds(b, { padding: PADDING, maxZoom: MAX_ZOOM, duration: FLY_MS });
    const onOver = (e: Event) => {
      const key = (e.target as Element).closest?.<HTMLElement>("[data-row]")?.dataset.row;
      if (key === current) return;
      clearTimeout(back);
      const route = key && byKey.get(key);
      if (route) {
        current = key;
        setHovered(key);
        fly(boundsOf([route.from, route.to]));
      } else if (current) {
        back = setTimeout(() => {
          current = undefined;
          setHovered(undefined);
          fly(home);
        }, RETURN_DELAY_MS);
      }
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("focusin", onOver);
    return () => {
      clearTimeout(back);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("focusin", onOver);
    };
  }, [byKey, home]);

  if (!webgl) return null;
  return (
    <div
      aria-hidden
      // Opaque: around a zoomed-out globe the canvas is transparent and would show the SVG map underneath.
      className={`absolute inset-0 bg-ink transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
    >
      <div ref={box} className="size-full" />
    </div>
  );
}
