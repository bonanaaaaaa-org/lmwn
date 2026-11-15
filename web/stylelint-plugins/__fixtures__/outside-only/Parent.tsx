import clsx from "clsx";
import { Button } from "react-aria-components";

import { Child } from "./Child";
import styles from "./Parent.module.css";

/** Defined in this file, so it shares Parent's stylesheet: not a child component. */
function Local({ className }: { className?: string }) {
  return <span className={className} />;
}

/**
 * Fixture for `custom/enforce-outside-only-classname`. Child classes: `Parent__Child`,
 * `Parent__Other` and `Parent__Active` (inside clsx). `Parent__Button` goes to a third-party
 * primitive and `Parent__Local` to a component in this file, so neither is a child class.
 */
export function Parent({ active }: { active: boolean }) {
  return (
    <div className={styles.Parent__Root}>
      <Child className={styles.Parent__Child} />
      <Child
        className={clsx(styles.Parent__Other, active && styles.Parent__Active)}
      />
      <Button className={styles.Parent__Button}>{String(active)}</Button>
      <Local className={styles.Parent__Local} />
    </div>
  );
}
