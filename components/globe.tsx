"use client";

import dynamic from "next/dynamic";

// three.js is heavy and needs a browser: load the globe after the page, over the SVG map it replaces.
export const Globe = dynamic(() => import("./globe-scene"), { ssr: false });
