"use client";

import { useEffect } from "react";

export function Scrollbars() {
  useEffect(() => {
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine)");
    const timers = new Map<Element, number>();
    const onScroll = (event: Event) => {
      if (!desktop.matches) return;
      const element = event.target === document ? document.documentElement : event.target;
      if (!(element instanceof Element)) return;
      element.classList.add("is-scrolling");
      window.clearTimeout(timers.get(element));
      timers.set(element, window.setTimeout(() => {
        element.classList.remove("is-scrolling");
        timers.delete(element);
      }, 700));
    };
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      timers.forEach((timer, element) => {
        window.clearTimeout(timer);
        element.classList.remove("is-scrolling");
      });
    };
  }, []);

  return null;
}
