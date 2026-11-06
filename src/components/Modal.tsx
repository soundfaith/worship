"use client";

import { useLayoutEffect, useRef } from "react";

export function Modal({ children, onClose, className = "", labelledBy, describedBy }: {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  labelledBy: string;
  describedBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) dialog.showModal();
    dialog?.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    return () => {
      if (dialog?.open) dialog.close();
      if (previousFocus?.isConnected && previousFocus.getClientRects().length) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}
      className={`app-modal ${className}`}
    >
      {children}
    </dialog>
  );
}

export function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm }: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal labelledBy="confirm-title" describedBy="confirm-message" onClose={onCancel} className="confirm-modal">
      <h2 id="confirm-title" className="display text-3xl text-stone-900">{title}</h2>
      <p id="confirm-message" className="mt-3 text-sm leading-relaxed text-stone-600">{message}</p>
      <div className="mt-7 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn" data-initial-focus onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
