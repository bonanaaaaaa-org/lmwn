import { useEffect } from "react";

/** Sets the browser tab title while mounted (when `title` is given), then puts the old one back. */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    if (title === undefined) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
