/** localStorage key under which the anonymous user id is stored. */
export const ANON_USER_ID_KEY = "araowl:anon-user-id";

type AnonStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Return the persisted anonymous user id, creating and storing a new UUID on
 * first use. Storage is injected so this works in the browser, in tests, and in
 * a future CLI (any object with getItem/setItem).
 */
export function getAnonUserId(storage: AnonStorage): string {
  const existing = storage.getItem(ANON_USER_ID_KEY);
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  storage.setItem(ANON_USER_ID_KEY, id);
  return id;
}
