import clsx from "clsx";
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import {
  Button as AriaButton,
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
} from "react-aria-components";

import { Button } from "@/components/common/Button";
import { Icon } from "@/components/common/Icon";
import { ResponsiveImage } from "@/components/common/ResponsiveImage";
import {
  photoAlt,
  photoRatio,
  photoSources,
} from "@/features/guides/lib/photos";
import type { Photo } from "@/features/guides/lib/types";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./Lightbox.module.css";

export interface LightboxProps {
  /** The Restaurant's name, for the title and alt text; absent for an Unavailable Restaurant. */
  name?: string;
  photos: readonly Photo[];
  /** Index of the photo on show (0-based). */
  current: number;
  /** Called with the new index when the diner moves to another photo. */
  onCurrentChange: (index: number) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  className?: string;
  /** The page's test ID; the dialog is `{parent}/lightbox`, with `/prev`, `/next` and `/close`. */
  parentTestId?: string;
}

/** A horizontal swipe shorter than this (in CSS px) is treated as a tap. */
const SWIPE_DISTANCE = 48;

type Direction = "next" | "prev";

/**
 * A full-screen viewer for a Guide Item's photos (React Aria modal dialog). It shows the
 * large image, moves with the prev/next buttons, the arrow keys, a swipe or a thumbnail,
 * and closes with Esc or the close button. It covers the whole viewport at every size,
 * with the photo as large as fits without cropping. Focus stays inside while it is open
 * and returns to whatever opened it. Transitions are off under `prefers-reduced-motion`.
 */
export function Lightbox({
  name,
  photos,
  current,
  onCurrentChange,
  isOpen,
  onOpenChange,
  className,
  parentTestId,
}: LightboxProps) {
  const testId = joinTestId(parentTestId, "lightbox");
  const total = photos.length;
  const index = Math.min(Math.max(current, 0), Math.max(total - 1, 0));
  const photo = photos[index];
  // Which way the last move went, so the incoming photo slides in from that side.
  const [direction, setDirection] = useState<Direction | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  // The latest `step`, for the keydown listener below (attached once per dialog element).
  const stepRef = useRef<(towards: Direction) => void>(() => {});

  // React Aria's Dialog doesn't forward onKeyDown, so listen on its element. Arrow keys
  // pressed anywhere inside (the dialog itself has focus on open) move between photos;
  // modified arrows (Alt+Left is "back", for one) stay with the browser.
  const dialogRef = useCallback((dialog: HTMLElement | null) => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      if (event.key === "ArrowRight") stepRef.current("next");
      else if (event.key === "ArrowLeft") stepRef.current("prev");
      else return;
      event.preventDefault();
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!photo) return null;

  const canMove = total > 1;
  const show = (next: number, towards: Direction) => {
    setDirection(towards);
    onCurrentChange(next);
  };
  const step = (towards: Direction) => {
    if (!canMove) return;
    const offset = towards === "next" ? 1 : -1;
    show((index + offset + total) % total, towards);
  };
  stepRef.current = step;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Swiping is for touch and pen; a mouse uses the buttons, keys or thumbnails.
    if (event.pointerType === "mouse" || !event.isPrimary) return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy)) return;
    step(dx < 0 ? "next" : "prev");
  };

  const label = name ?? m.lightbox_title_unnamedLabel();
  // The large image, or the small one if upstream left the large URL blank.
  const [small, large] = photoSources(photo);
  const shown = [large, small].find((source) => source?.url.trim());
  const ratio = photoRatio(shown?.url ?? "");

  return (
    <ModalOverlay
      className={styles.Lightbox__Overlay}
      isOpen={isOpen}
      onOpenChange={(open) => {
        // The next open fades in without sliding from the last move's side.
        if (!open) setDirection(null);
        onOpenChange(open);
      }}
      isDismissable
    >
      <Modal className={styles.Lightbox__Modal}>
        <Dialog
          className={clsx(styles.Lightbox__Root, className)}
          data-testid={testId}
          ref={dialogRef}
        >
          {({ close }) => (
            <>
              {/* First, so the controls after it paint on top where the photo fills the screen. */}
              <div
                className={styles.Lightbox__Stage}
                data-testid={`${testId}/stage`}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={() => {
                  swipeStart.current = null;
                }}
              >
                <div
                  // A new key per photo replays the entrance transition.
                  key={index}
                  className={styles.Lightbox__Frame}
                  data-direction={direction ?? undefined}
                  style={{ "--photo-ratio": ratio } as CSSProperties}
                >
                  <ResponsiveImage
                    sources={shown ? [shown] : []}
                    alt={photoAlt(index + 1, total, name)}
                    aspectRatio={String(ratio)}
                    sizes="100vw"
                    priority
                  />
                </div>
              </div>

              <div className={styles.Lightbox__Header}>
                <Heading
                  slot="title"
                  level={2}
                  className={styles.Lightbox__Title}
                >
                  {label}{" "}
                  <span className={styles.Lightbox__Counter} aria-live="polite">
                    {m.lightbox_counter_body({ position: index + 1, total })}
                  </span>
                </Heading>
                <Button
                  variant="overlay"
                  aria-label={m.lightbox_close_ariaLabel()}
                  onPress={close}
                  testId={`${testId}/close`}
                >
                  <Icon name="close" size={20} strokeWidth={2.2} />
                </Button>
              </div>

              {canMove && (
                <Button
                  className={styles.Lightbox__Prev}
                  variant="overlay"
                  aria-label={m.lightbox_prev_ariaLabel()}
                  onPress={() => step("prev")}
                  testId={`${testId}/prev`}
                >
                  <Icon name="chevron-left" size={20} strokeWidth={2.2} />
                </Button>
              )}

              {canMove && (
                <Button
                  className={styles.Lightbox__Next}
                  variant="overlay"
                  aria-label={m.lightbox_next_ariaLabel()}
                  onPress={() => step("next")}
                  testId={`${testId}/next`}
                >
                  <Icon name="chevron-right" size={20} strokeWidth={2.2} />
                </Button>
              )}

              {canMove && (
                <ul
                  className={styles.Lightbox__Thumbs}
                  aria-label={m.lightbox_thumbnails_ariaLabel()}
                >
                  {photos.map((thumb, position) => (
                    // Upstream can reuse one photo ID for different photos, so the position is part of the key.
                    <li key={`${position}:${thumb.id}`}>
                      <AriaButton
                        className={styles.Lightbox__Thumb}
                        aria-label={photoAlt(position + 1, total, name)}
                        aria-current={position === index ? "true" : undefined}
                        // Keyboard users move with the arrow keys; Tab stays on the main controls.
                        excludeFromTabOrder
                        onPress={() => {
                          if (position !== index) {
                            show(position, position > index ? "next" : "prev");
                          }
                        }}
                      >
                        <ResponsiveImage
                          sources={photoSources(thumb).slice(0, 1)}
                          radius="200"
                          alt=""
                          aspectRatio="1 / 1"
                          sizes="3rem"
                        />
                      </AriaButton>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
