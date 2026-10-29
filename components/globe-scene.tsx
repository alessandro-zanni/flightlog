"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactGlobe, { type GlobeMethods } from "react-globe.gl";
import { MeshPhongMaterial } from "three";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesTopo from "world-atlas/countries-110m.json";
import { viewOf, type Point } from "@/lib/globe";

export type GlobeRoute = { key: string; from: Point; to: Point };
export type GlobeAirport = Point & { code: string };

// Sign-system colours (DESIGN.md): the globe is a lit object, but yellow still only marks routes.
const SIGN = "#ffcc00";
const DIM = "rgba(255, 204, 0, 0.2)";
const MUTED = "#4a4a4a";
const INK = "#0b0b0b";

const topo = countriesTopo as unknown as Topology;
const land = feature(topo, topo.objects.countries as GeometryCollection).features;
const ocean = new MeshPhongMaterial({ color: "#1a1a1a", shininess: 8 });

const ARRIVAL_MS = 1400;
const FLY_MS = 700;
const RETURN_DELAY_MS = 400;

export default function GlobeScene({
  routes,
  airports,
  highlight,
}: Readonly<{ routes: GlobeRoute[]; airports: GlobeAirport[]; highlight?: string }>) {
  const globe = useRef<GlobeMethods | undefined>(undefined);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<string>();
  // Arc width is in globe units: scale it with the camera so routes stay hairlines up close, in coarse steps.
  const [altitude, setAltitude] = useState(2);
  const [webgl] = useState(() => !!document.createElement("canvas").getContext("webgl2"));
  const [still] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);

  const byKey = useMemo(() => new Map(routes.map((r) => [r.key, r])), [routes]);
  const home = useMemo(() => {
    const route = highlight && byKey.get(highlight);
    return route ? viewOf([route.from, route.to]) : viewOf(airports);
  }, [highlight, byKey, airports]);
  const lit = hovered ?? highlight;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const resize = new ResizeObserver(([e]) => setSize([e.contentRect.width, e.contentRect.height]));
    // A globe nobody sees should not keep the GPU busy.
    const visible = new IntersectionObserver(([e]) =>
      e.isIntersecting ? globe.current?.resumeAnimation() : globe.current?.pauseAnimation(),
    );
    resize.observe(el);
    visible.observe(el);
    return () => {
      resize.disconnect();
      visible.disconnect();
    };
  }, []);

  // Hovering or focusing a list row turns the globe to that route; leaving the list turns it back home.
  useEffect(() => {
    let current: string | undefined;
    let back: ReturnType<typeof setTimeout>;
    const ms = still ? 0 : FLY_MS;
    const onOver = (e: Event) => {
      const key = (e.target as Element).closest?.<HTMLElement>("[data-row]")?.dataset.row;
      if (key === current) return;
      clearTimeout(back);
      const route = key && byKey.get(key);
      if (route) {
        current = key;
        setHovered(key);
        globe.current?.pointOfView(viewOf([route.from, route.to]), ms);
      } else if (current) {
        back = setTimeout(() => {
          current = undefined;
          setHovered(undefined);
          globe.current?.pointOfView(home, ms);
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
  }, [byKey, home, still]);

  const onReady = () => {
    const g = globe.current;
    if (!g) return;
    const controls = g.controls();
    const r = g.getGlobeRadius();
    controls.enablePan = false;
    controls.enableDamping = !still;
    controls.minDistance = r * 1.2;
    controls.maxDistance = r * 4;
    if (still) {
      g.pointOfView(home, 0);
    } else {
      // The one authored moment: the whole planet first, then the part of it actually flown.
      g.pointOfView({ lat: home.lat - 20, lng: home.lng - 70, altitude: 3 }, 0);
      g.pointOfView(home, ARRIVAL_MS);
    }
    setReady(true);
  };

  if (!webgl) return null;
  return (
    <div
      ref={box}
      aria-hidden
      className={`absolute inset-0 transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
    >
      {size[0] > 0 && (
        <ReactGlobe
          ref={globe}
          width={size[0]}
          height={size[1]}
          backgroundColor={INK}
          globeMaterial={ocean}
          atmosphereColor="#ffffff"
          atmosphereAltitude={0.12}
          onGlobeReady={onReady}
          polygonsData={land}
          polygonCapColor={() => "#333333"}
          polygonSideColor={() => INK}
          polygonStrokeColor={() => INK}
          polygonAltitude={0.005}
          polygonsTransitionDuration={0}
          arcsData={routes}
          arcStartLat={(r: object) => (r as GlobeRoute).from.lat}
          arcStartLng={(r: object) => (r as GlobeRoute).from.lon}
          arcEndLat={(r: object) => (r as GlobeRoute).to.lat}
          arcEndLng={(r: object) => (r as GlobeRoute).to.lon}
          arcColor={(r: object) => {
            if (!lit || (r as GlobeRoute).key === lit) return SIGN;
            return hovered ? DIM : MUTED;
          }}
          arcStroke={(r: object) => ((r as GlobeRoute).key === lit ? 0.6 : 0.3) * altitude}
          onZoom={({ altitude: a }) => setAltitude(Math.round(a * 4) / 4)}
          arcAltitudeAutoScale={0.4}
          arcsTransitionDuration={still ? 0 : ARRIVAL_MS}
          pointsData={airports}
          pointLng="lon"
          pointColor={() => "#ffffff"}
          pointAltitude={0.006}
          pointRadius={0.22}
          pointLabel={(a: object) => `<span class="globe-label">${(a as GlobeAirport).code}</span>`}
          pointsTransitionDuration={0}
        />
      )}
    </div>
  );
}
