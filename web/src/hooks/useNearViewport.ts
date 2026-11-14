import { useEffect, useState, type RefObject } from "react";

/**
 * True once the element comes within `margin` of the viewport, and from then on. Without
 * IntersectionObserver (old browsers, jsdom) it is true from the first effect.
 */
export function useNearViewport(
  ref: RefObject<Element | null>,
  margin = "300px",
): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (near || !element) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: `${margin} 0px` },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, margin, near]);
  return near;
}
