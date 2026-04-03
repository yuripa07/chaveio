const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O, 0, I, 1 (ambiguous)

/** Generates a random 6-character uppercase URL-safe tournament code. */
export function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
