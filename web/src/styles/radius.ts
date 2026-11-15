/**
 * A corner radius from the design tokens (`--radius-*` in globals.css), for components that
 * take their radius as a prop: the parent picks it, the component's own CSS applies it (#69).
 */
export type Radius = "none" | "100" | "200" | "300" | "400" | "pill";
