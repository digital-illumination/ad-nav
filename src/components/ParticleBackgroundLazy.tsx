"use client";

import dynamic from "next/dynamic";

/**
 * Client-side wrapper that defers the ParticleBackground bundle off the
 * critical path. The canvas is purely decorative, so there's no benefit to
 * shipping it in the initial hydration payload or rendering it on the server.
 *
 * With `ssr: false`, Next excludes this component from SSR and loads its code
 * after hydration, which removes its contribution to TBT and legacy JS.
 */
const ParticleBackground = dynamic(() => import("./ParticleBackground"), {
  ssr: false,
});

export default function ParticleBackgroundLazy() {
  return <ParticleBackground />;
}
