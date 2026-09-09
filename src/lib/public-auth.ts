export const PUBLIC_SESSION_COOKIE = "biblioteca_public_session";

export function constantTimeEqualPublic(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;

  for (let i = 0; i < maxLength; i += 1) {
    mismatch |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }

  return mismatch === 0;
}

export async function createPublicSessionToken(
  password: string
): Promise<string> {
  const payload = new TextEncoder().encode(
    `biblioteca-publica\u0000${password}`
  );

  const digest = await crypto.subtle.digest("SHA-256", payload);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
