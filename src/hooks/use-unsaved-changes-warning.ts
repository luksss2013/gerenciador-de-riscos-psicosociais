"use client";

import { useEffect, useRef } from "react";

/**
 * Browser-level guard against losing unsaved work when the user navigates
 * away (close tab, reload, back button, external link).
 *
 * Set `dirty` to `true` while a debounced auto-save is in flight or when
 * local edits have not yet been persisted. Set it back to `false` once the
 * save resolves. The hook only attaches the `beforeunload` listener while
 * dirty, so a clean form never triggers the browser's "Leave site?" dialog.
 *
 * This is intentionally a *passive* warning: it does not block the
 * navigation (browsers ignore `event.preventDefault()` unless the user
 * has interacted with the page, and that interaction is exactly the
 * editing flow we want to protect). For in-app navigation, callers should
 * pair this with their own router guard.
 */
export function useUnsavedChangesWarning(dirty: boolean): void {
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
