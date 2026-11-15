/** Fixture: one of the project's own components, which a parent styles through className. */
export function Child({ className }: { className?: string }) {
  return <span className={className} />;
}
