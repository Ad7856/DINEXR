"use client";
import { createElement, useEffect, useRef, useState } from "react";

type Props = { glbUrl: string; usdzUrl?: string | null; name: string; onStatus: (s: "ready" | "error", arOk: boolean) => void; };
export type ViewerHandle = { activateAR?: () => Promise<void>; canActivateAR?: boolean } & HTMLElement;

/** Thin wrapper over Google's <model-viewer>. Loaded on demand so the menu stays fast. */
export function ModelViewer({ glbUrl, usdzUrl, name, onStatus }: Props) {
  const ref = useRef<ViewerHandle | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => { import("@google/model-viewer").then(() => setArmed(true)).catch(() => onStatus("error", false)); }, [onStatus]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !armed) return;
    const ok = () => onStatus("ready", !!el.canActivateAR);
    const onLoad = () => { ok(); setTimeout(ok, 1000); }; // AR capability resolves asynchronously
    const onErr = () => onStatus("error", false);
    el.addEventListener("load", onLoad);
    el.addEventListener("error", onErr);
    return () => { el.removeEventListener("load", onLoad); el.removeEventListener("error", onErr); };
  }, [armed, onStatus]);

  return createElement("model-viewer", {
    ref, src: glbUrl, "ios-src": usdzUrl ?? undefined, alt: `3D model of ${name}`,
    "camera-controls": true, "touch-action": "pan-y", ar: true, "ar-modes": "webxr scene-viewer quick-look",
    "shadow-intensity": "1", style: { width: "100%", height: "320px", background: "transparent" },
  });
}
