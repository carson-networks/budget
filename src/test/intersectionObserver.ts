import { act } from "@testing-library/react";
import { vi } from "vitest";

/**
 * Replaces `IntersectionObserver` with a controllable fake (call
 * `vi.unstubAllGlobals()` to restore). `scrollIntoView()` reports every
 * currently observed element as intersecting, like scrolling to the end of a list.
 */
export function stubIntersectionObserver() {
  const observed = new Map<MockObserver, Set<Element>>();

  class MockObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(element: Element) {
      const elements = observed.get(this) ?? new Set();
      elements.add(element);
      observed.set(this, elements);
    }
    unobserve(element: Element) {
      observed.get(this)?.delete(element);
    }
    disconnect() {
      observed.delete(this);
    }
    takeRecords() {
      return [];
    }
    fire() {
      const entries = [...(observed.get(this) ?? [])].map((target) => ({
        isIntersecting: true,
        target,
      }));
      if (entries.length > 0) {
        this.callback(
          entries as IntersectionObserverEntry[],
          this as unknown as IntersectionObserver,
        );
      }
    }
  }

  vi.stubGlobal("IntersectionObserver", MockObserver);
  return {
    observedCount: () =>
      [...observed.values()].reduce((count, set) => count + set.size, 0),
    scrollIntoView: () =>
      act(() => [...observed.keys()].forEach((observer) => observer.fire())),
  };
}
