const KEY_PREFIX = "chaveio_token_";

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
  } catch {
    // Silently fail — app still works via API
  }
}
