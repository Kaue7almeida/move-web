"use client";

import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";

/**
 * Renders an exercise demonstration frame.
 *
 * When `animate` is true AND both `imageUrl` (start frame) and `imageEndUrl`
 * (end frame) are provided, alternates between them every 800 ms using a CSS
 * opacity crossfade — no GIF files involved.
 *
 * Respects `prefers-reduced-motion`: when set, shows the start frame statically.
 * Canvas cards call this without `animate` (default false) and stay static.
 *
 * `fit` controls how the image sits in its box: "cover" (default) fills and
 * crops — good for small square thumbnails; "contain" shows the whole frame
 * without cropping (letterboxed) — used in guided execution so no part of the
 * demonstration is cut off.
 */
export function ExerciseThumbnail({
  imageUrl,
  imageEndUrl = null,
  name,
  animate = false,
  fit = "cover",
  className = "",
  iconSize = 18,
}: {
  imageUrl: string | null;
  imageEndUrl?: string | null;
  name: string;
  animate?: boolean;
  fit?: "cover" | "contain";
  className?: string;
  iconSize?: number;
}) {
  const canAnimate = animate && imageUrl !== null && imageEndUrl !== null;
  const fitClass = fit === "contain" ? "bg-contain bg-no-repeat bg-center" : "bg-cover bg-center";

  // showStart controls which layer is on top; toggled by the interval.
  const [showStart, setShowStart] = useState(true);

  useEffect(() => {
    if (!canAnimate) return;

    // Honour the OS/browser reduced-motion preference.
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    const id = setInterval(() => setShowStart((s) => !s), 800);
    return () => clearInterval(id);
  }, [canAnimate]);

  // ── No image → icon placeholder ──────────────────────────────────────────
  if (!imageUrl) {
    return (
      <div
        aria-hidden="true"
        className={`flex items-center justify-center bg-accent-muted text-accent ${className}`}
      >
        <Dumbbell size={iconSize} strokeWidth={1.7} />
      </div>
    );
  }

  // ── Image pair → two crossfading layers ──────────────────────────────────
  // Both images are loaded in the DOM from mount so there is no flicker on the
  // first switch. The interval toggles `showStart`; CSS `transition-opacity`
  // (300 ms) provides the crossfade. When reduced-motion is on, `showStart`
  // never changes and the start frame stays fully visible.
  if (canAnimate && imageEndUrl) {
    return (
      <div
        role="img"
        aria-label={`Demonstração de ${name}`}
        className={`relative overflow-hidden ${className}`}
      >
        <div
          className={`absolute inset-0 ${fitClass} transition-opacity duration-300`}
          style={{ backgroundImage: `url("${imageUrl}")`, opacity: showStart ? 1 : 0 }}
        />
        <div
          className={`absolute inset-0 ${fitClass} transition-opacity duration-300`}
          style={{ backgroundImage: `url("${imageEndUrl}")`, opacity: showStart ? 0 : 1 }}
        />
      </div>
    );
  }

  // ── Single image → static ─────────────────────────────────────────────────
  return (
    <div
      role="img"
      aria-label={`Demonstração de ${name}`}
      className={`bg-surface-strong ${fitClass} ${className}`}
      style={{ backgroundImage: `url("${imageUrl}")` }}
    />
  );
}
