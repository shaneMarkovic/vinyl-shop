export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <VinylMark className="h-7 w-7 shrink-0" />
      <span className="font-display text-xl font-semibold tracking-tight leading-none">
        Vinyl<span className="text-accent">Vibe</span>
      </span>
    </span>
  );
}

/** A spinning-disc mark: grooves + label + center hole. */
export function VinylMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="23" className="fill-foreground" />
      <circle cx="24" cy="24" r="18" className="stroke-background" strokeWidth="0.75" opacity="0.35" />
      <circle cx="24" cy="24" r="14" className="stroke-background" strokeWidth="0.75" opacity="0.35" />
      <circle cx="24" cy="24" r="10" className="stroke-background" strokeWidth="0.75" opacity="0.35" />
      <circle cx="24" cy="24" r="7" className="fill-accent" />
      <circle cx="24" cy="24" r="1.6" className="fill-background" />
    </svg>
  );
}
