import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

// Auth forms lock submit until this is true: an earlier submit reloads the page and wipes the form.
export function useHydrated() {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}
