import { beforeEach, vi } from "vitest";

/**
 * Pin the host time zone before anything imports a module.
 *
 * GitHub's runners are UTC, so a stray local getter used on a value that is
 * only nominally UTC — the wall-clock arithmetic in schedule.js is full of
 * them — would pass in CI and fail in Brussels. UTC+14 makes that class of bug
 * fail loudly instead, and it is far enough out that an off-by-one day shows up
 * immediately. Node re-reads TZ, so setting it here is enough.
 */
process.env.TZ = "Pacific/Kiritimati";

/**
 * Minimal spec-shaped localStorage stub.
 * `key(i)` and `length` are required: clearExpiredCache iterates by index.
 */
class LocalStorageStub {
  #store = new Map();

  get length() {
    return this.#store.size;
  }

  key(i) {
    return [...this.#store.keys()][i] ?? null;
  }

  getItem(k) {
    return this.#store.has(k) ? this.#store.get(k) : null;
  }

  setItem(k, v) {
    this.#store.set(k, String(v));
  }

  removeItem(k) {
    this.#store.delete(k);
  }

  clear() {
    this.#store.clear();
  }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new LocalStorageStub());
});
