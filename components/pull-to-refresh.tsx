"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PULL_TRIGGER, pullOffset } from "@/lib/pull";
import { Plate, SignArrow } from "./pictograms";

const PLATE = 40;

// Only in the home-screen web app: Safari tabs have their own pull to refresh. Listeners are passive,
// so scrolling and the map (two-finger pan on touch) are never blocked; a one-finger downward pull
// starting at the very top re-renders the server components with fresh data.
export function PullToRefresh({ label }: Readonly<{ label: string }>) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const standalone =
      matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (!standalone) return;
    let startY: number | null = null;
    let last = 0;
    const reset = () => {
      startY = null;
      last = 0;
      setOffset(0);
    };
    const start = (e: TouchEvent) => {
      startY = e.touches.length === 1 && scrollY <= 0 ? e.touches[0].clientY : null;
    };
    const move = (e: TouchEvent) => {
      if (startY === null) return;
      if (e.touches.length !== 1) return reset();
      last = scrollY > 0 ? 0 : pullOffset(e.touches[0].clientY - startY);
      setOffset(last);
    };
    const end = () => {
      if (startY !== null && last >= PULL_TRIGGER) startTransition(() => router.refresh());
      reset();
    };
    const opts = { passive: true };
    addEventListener("touchstart", start, opts);
    addEventListener("touchmove", move, opts);
    addEventListener("touchend", end, opts);
    addEventListener("touchcancel", reset, opts);
    return () => {
      removeEventListener("touchstart", start);
      removeEventListener("touchmove", move);
      removeEventListener("touchend", end);
      removeEventListener("touchcancel", reset);
    };
  }, [router]);

  const lit = pending || offset >= PULL_TRIGGER;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      {(offset > 0 || pending) && (
        <span style={{ transform: `translateY(${(pending ? PULL_TRIGGER : offset) - PLATE}px)` }}>
          {/* The arrow lights yellow once releasing will refresh, like a lit route. */}
          <Plate className="size-10">
            <SignArrow
              className={`size-6 rotate-90 ${lit ? "text-sign" : ""} ${pending ? "motion-safe:animate-pulse" : ""}`}
            />
          </Plate>
        </span>
      )}
      {pending && <span className="sr-only">{label}</span>}
    </div>
  );
}
