"use client";

import { useId } from "react";
import { Camera, RefreshCw } from "lucide-react";

/**
 * Mock photo capture (presentational): opens the device camera/gallery via a file
 * input and shows a local preview (CSS background-image, no upload). The preview URL
 * lifecycle is owned by the parent — nothing is sent anywhere.
 */
export function ScanPhotoCapture({
  label,
  hint,
  previewUrl,
  onSelect,
}: {
  label: string;
  hint: string;
  previewUrl: string | null;
  onSelect: (file: File | null) => void;
}) {
  const inputId = useId();

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onSelect(event.target.files?.[0] ?? null);
  }

  return (
    // Cap the portrait box to a sensible width so the 3:4 frame doesn't become
    // huge on desktop nor overflow on small screens; centered like a dropzone.
    <div className="mx-auto w-full max-w-xs">
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="sr-only"
      />

      {previewUrl ? (
        <div className="space-y-3">
          <div
            role="img"
            aria-label={`Pré-visualização da ${label.toLowerCase()}`}
            className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-surface-strong bg-cover bg-center"
            style={{ backgroundImage: `url("${previewUrl}")` }}
          />
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-strong px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <RefreshCw size={14} />
            Refazer foto
          </label>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 px-6 text-center transition-colors hover:border-accent/40 hover:bg-surface-hover"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted text-accent">
            <Camera size={22} strokeWidth={1.7} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-0.5 text-xs text-muted">{hint}</p>
          </div>
        </label>
      )}
    </div>
  );
}
