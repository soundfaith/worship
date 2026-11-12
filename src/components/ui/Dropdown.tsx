"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "../Icon";

export interface DropdownItem<T extends string = string> {
  value: T;
  label: string;
  render?: ReactNode;
}

export default function Dropdown<T extends string>({ label, items, selectedValue, onSelect, className = "", selectedRender }: {
  label: string;
  items: DropdownItem<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  className?: string;
  selectedRender?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const search = useRef({ text: "", time: 0 });
  const selectedIndex = items.findIndex((item) => item.value === selectedValue);
  const selected = items[selectedIndex];
  const activeIndex = Math.max(0, Math.min(active, items.length - 1));

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, listId, activeIndex]);

  const choose = (index: number) => {
    const item = items[index];
    if (item) onSelect(item.value);
    setOpen(false);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActive(selectedIndex >= 0 ? selectedIndex : event.key === "ArrowDown" ? 0 : items.length - 1);
        setOpen(true);
      } else {
        setActive(Math.max(0, Math.min(items.length - 1, activeIndex + (event.key === "ArrowDown" ? 1 : -1))));
      }
    } else if (open && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : items.length - 1);
    } else if (open && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text = (now - search.current.time < 700 ? search.current.text : "") + event.key.toLowerCase();
      search.current = { text, time: now };
      const index = items.findIndex((item) => item.label.toLowerCase().startsWith(text));
      if (index >= 0) {
        setActive(index);
        setOpen(true);
      }
    }
  };

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`} onBlur={(event) => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && items.length ? `${listId}-${activeIndex}` : undefined}
        disabled={!items.length}
        className="input flex w-full min-w-0 items-center gap-2 text-left disabled:opacity-50"
        onKeyDown={onKeyDown}
        onClick={() => {
          if (!open) setActive(Math.max(0, selectedIndex));
          setOpen(!open);
        }}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">{selectedRender ?? selected?.render ?? selected?.label ?? label}</span>
        <Icon name="chevron" className="ml-auto h-4 w-4 shrink-0 text-stone-400" />
      </button>
      {open && (
        <div id={listId} role="listbox" aria-label={label} className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-stone-200 bg-surface p-2 shadow-xl">
          {items.map((item, index) => (
            <div
              key={item.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={item.value === selectedValue}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${index === activeIndex ? "bg-stone-100" : "hover:bg-stone-100"}`}
              onPointerMove={(event) => {
                if (event.pointerType === "mouse") setActive(index);
              }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              {item.render ?? <span className="truncate">{item.label}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
