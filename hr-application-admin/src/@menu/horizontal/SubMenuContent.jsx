"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { menuClasses } from "../utils/menuClasses";

const Container = styled.div`
  /* Fixed positioning works reliably with Portal bounding boxes */
  position: fixed; 
  box-sizing: border-box;
  padding: 6px 0;
  
  /* Stack ordering */
  z-index: ${({ level }) => 9999 + level};
  
  /* Keep nested menu hover areas accessible without clipping text */
  overflow: visible !important;

  /* Transitions */
  opacity: 0;
  visibility: hidden;
  transform: translateY(6px);
  transition:
    opacity ${({ transitionDuration }) => transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1),
    transform ${({ transitionDuration }) => transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;

  &.${menuClasses.open} {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    pointer-events: auto;
  }

  /* Hover Target Bridge */
  &::before {
    content: "";
    position: absolute;
    top: -12px;
    bottom: -12px;
    left: -12px;
    right: -12px;
    z-index: -1;
  }

  ul,
  ul:not([class]) {
    list-style: none;
    margin: 0;
    margin-block: 0;
    padding: 0;
    padding-inline-start: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
  }

  ul > li {
    width: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    /* Prevent child items from pushing parent width */
    min-width: 0; 
  }

  /* Target direct interactive items inside li */
  ul > li > * {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    min-width: 0; /* CRITICAL for flex truncation to work */
  }

  ul > li > .${menuClasses.button} {
    min-height: 40px;
    padding: 10px 18px;
    border-radius: 0;
    font-size: 0.875rem;

    &:hover {
      background: var(--mui-palette-action-hover);
    }
  }

  ul > li.${menuClasses.active} > .${menuClasses.button} {
    color: var(--mui-palette-primary-main);
    background: var(--mui-palette-action-selected);
    box-shadow: none;
  }

  /* Force label text truncation on overflow */
  ul > li span, 
  ul > li .menu-label,
  ul > li a {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  ${({ rootStyles }) => rootStyles}
`;

const SubMenuContent = (props, ref) => {
  const {
    children,
    open,
    level = 0,
    transitionDuration = 200,
    anchorRef,
    rootStyles,
    ...rest
  } = props;

  const elRef = useRef(null);
  const [styles, setStyles] = useState({
    left: -9999,
    top: -9999,
    width: 220,
    transformOrigin: "top left",
    isReady: false,
  });

  useImperativeHandle(ref, () => elRef.current);

  useEffect(() => {
    const anchor = anchorRef?.current;
    if (!open || !anchor) {
      setStyles((prev) => ({ ...prev, isReady: false }));
      return;
    }

    const updatePosition = () => {
      const anchorRect = anchor.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      // Set explicit fixed width bounds (Min 220px, Max 320px or Viewport Limit)
      const contentMargin = 10; 
      const contentWidth = Math.min(300, Math.max(220, viewportW - contentMargin * 2));

      const measuredHeight = elRef.current?.offsetHeight || 0;
      const contentHeight = measuredHeight || 200;

      let left = 0;
      let top = 0;
      let transformOrigin = "top left";

      if (level === 0) {
        // --- LEVEL 0: OPEN DOWNWARDS ---
        left = anchorRect.left;
        top = anchorRect.bottom + 4;

        if (left + contentWidth > viewportW - contentMargin) {
          left = Math.max(contentMargin, anchorRect.right - contentWidth);
          transformOrigin = "top right";
        }
      } else {
        // --- LEVEL > 0: NESTED FLYOUT ---
        left = anchorRect.right + contentMargin;
        top = anchorRect.top - 6;

        if (left + contentWidth > viewportW - contentMargin) {
          left = anchorRect.left - contentWidth - contentMargin;
          transformOrigin = "top right";
        }
      }

      // Check vertical overflow (Flip UP)
      if (top + contentHeight > viewportH - contentMargin) {
        top = Math.max(contentMargin, anchorRect.bottom - contentHeight);
        transformOrigin = transformOrigin.includes("right") ? "bottom right" : "bottom left";
      }

      setStyles({
        left,
        top,
        width: contentWidth,
        transformOrigin,
        isReady: true,
      });
    };

    const rafId = requestAnimationFrame(updatePosition);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, level, children]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <Container
      ref={elRef}
      level={level}
      className={open && styles.isReady ? menuClasses.open : ""}
      transitionDuration={transitionDuration}
      rootStyles={rootStyles}
      style={{
        position: "fixed",
        left: styles.left,
        top: styles.top,
        width: styles.width, // Hard width prevents overflowing elements from forcing resize
        transformOrigin: styles.transformOrigin,
        zIndex: 9999 + level,
      }}
      {...rest}
    >
      <ul>{children}</ul>
    </Container>,
    document.body
  );
};

export default forwardRef(SubMenuContent);