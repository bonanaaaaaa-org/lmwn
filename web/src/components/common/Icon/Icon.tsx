import clsx from "clsx";

import styles from "./Icon.module.css";

/** Stroke icons on a 24-unit grid, from the design canvas's icon sheet. */
const PATHS = {
  search: ["M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z", "m20 20-3.5-3.5"],
  close: ["M18 6 6 18", "m6 6 12 12"],
  check: ["M20 6 9 17l-5-5"],
  share: [
    "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7",
    "M16 6l-4-4-4 4",
    "M12 2v13",
  ],
  "chevron-left": ["m15 18-6-6 6-6"],
  "chevron-right": ["m9 18 6-6-6-6"],
  "chevron-down": ["m6 9 6 6 6-6"],
  "chevron-up": ["m18 15-6-6-6 6"],
  phone: [
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
  ],
  instagram: [
    "M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5z",
    "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z",
    "M17.5 6.5h.01",
  ],
  external: ["M7 17 17 7", "M8 7h9v9"],
  spinner: ["M21 12a9 9 0 1 1-6.2-8.6"],
  clock: ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", "M12 7v5l3 2"],
  // Lucide badge-check.
  "badge-check": [
    "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z",
    "m9 12 2 2 4-4",
  ],
  alert: ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", "M12 8v5", "M12 16.5v.01"],
  "alert-triangle": [
    "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
    "M12 9v4",
    "M12 17h.01",
  ],
  image: [
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M8.5 7a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3z",
    "m21 15-5-5L5 21",
  ],
  "arrow-left": ["M19 12H5", "m12 19-7-7 7-7"],
  "map-pin": [
    "M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z",
    "M12 7a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z",
  ],
  gem: ["M6 3h12l4 6-10 12L2 9z", "M2 9h20", "M12 21 8 9l4-6 4 6z"],
  monitor: [
    "M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
    "M8 20h8",
    "M12 16v4",
  ],
  sun: [
    "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z",
    "M12 2v2",
    "M12 20v2",
    "m4.9 4.9 1.4 1.4",
    "m17.7 17.7 1.4 1.4",
    "M2 12h2",
    "M20 12h2",
    "m6.3 17.7-1.4 1.4",
    "m19.1 4.9-1.4 1.4",
  ],
  moon: ["M20.4 14.5A8.5 8.5 0 1 1 9.5 3.6a6.6 6.6 0 0 0 10.9 10.9z"],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

/**
 * The icon's colour: `muted` secondary text · `accent` saffron · `accent-text` the gold that
 * passes contrast as text · `danger-inverse` red on a dark surface. Without it the icon takes
 * the text colour around it (`currentColor`).
 */
export type IconTone = "muted" | "accent" | "accent-text" | "danger-inverse";

export interface IconProps {
  name: IconName;
  /** Rendered size in px (the canvas uses 12–40). Defaults to 20. */
  size?: number;
  /** Stroke width in grid units. Defaults to 2. */
  strokeWidth?: number;
  tone?: IconTone;
  className?: string;
}

/**
 * A decorative stroke icon in `currentColor` (or its `tone`). Always hidden from assistive tech: the
 * control or text next to it carries the meaning. `data-icon` names the icon for tests.
 */
export function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  tone,
  className,
}: IconProps) {
  return (
    <svg
      className={clsx(styles.Icon__Root, className)}
      data-icon={name}
      data-tone={tone}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
