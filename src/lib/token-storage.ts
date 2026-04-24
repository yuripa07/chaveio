const KEY_PREFIX = "chaveio_token_";

const listeners = new Set<() => void>();

function notify() {
  for (const cb of listeners) cb();
}

export function getStoredToken(code: string): string | null {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${code}`);
  } catch {
    return null;
  }
}

export function setStoredToken(code: string, token: string): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${code}`, token);
    notify();
  } catch {
    // Silently fail — app still works via API
  }
}

export function clearStoredToken(code: string): void {
  try {
    localStorage.removeItem(`${KEY_PREFIX}${code}`);
    notify();
  } catch {}
}

export function subscribeStoredToken(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(KEY_PREFIX)) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}
