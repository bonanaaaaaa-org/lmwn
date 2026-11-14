import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface HeaderSlotValue {
  element: HTMLElement | null;
  setElement: (element: HTMLElement | null) => void;
}

const HeaderSlotContext = createContext<HeaderSlotValue | null>(null);

/**
 * Lets a page put one action in the app header (the Guide's share button on a phone)
 * while the page keeps the data it needs. The app shell provides it around the header and
 * `<main>`.
 */
export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ element, setElement }), [element]);
  return (
    <HeaderSlotContext.Provider value={value}>
      {children}
    </HeaderSlotContext.Provider>
  );
}

/** Where the header shows a page's action; it keeps its size when empty. */
export function HeaderSlotTarget({ className }: { className?: string }) {
  const slot = useContext(HeaderSlotContext);
  return <span ref={slot?.setElement} className={className} />;
}

/**
 * Renders `children` into the header's slot. Without a `HeaderSlotProvider` (a component on
 * its own in a story or test) they render in place.
 */
export function HeaderSlotPortal({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderSlotContext);
  if (!slot) return <>{children}</>;
  return slot.element ? createPortal(children, slot.element) : null;
}
