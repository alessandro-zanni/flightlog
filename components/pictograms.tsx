// Sign pictograms: solid white shapes drawn on a 24-unit grid, shown on black inset squares.
type Props = Readonly<{ className?: string }>;

export function Plane({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
    </svg>
  );
}

export function Arrow({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
      <path d="M4 12h15M13 5l7 7-7 7" strokeLinecap="square" />
    </svg>
  );
}

export function Plus({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
      <path d="M12 4v16M4 12h16" strokeLinecap="square" />
    </svg>
  );
}

// Inset black square carrying a pictogram, the sign system's icon plate.
export function Plate({ children, className = "size-14" }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <span className={`flex shrink-0 items-center justify-center bg-ink text-white ${className}`}>{children}</span>;
}

// Solid sign arrow, drawn like the plane: for plates locked to the edge of a band.
export function SignArrow({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M3 10h11V4.5l7.5 7.5-7.5 7.5V14H3z" />
    </svg>
  );
}

// "BLQ → BCN" with the drawn arrow, read aloud as "BLQ to BCN".
export function Route({ from, to, sep }: Readonly<{ from: string; to: string; sep: string }>) {
  return (
    <>
      {from}
      <Arrow className="mx-[0.25em] inline size-[0.8em] align-[-0.05em]" />
      <span className="sr-only"> {sep} </span>
      {to}
    </>
  );
}
