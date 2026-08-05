// crypto.randomUUID() only exists in secure contexts (HTTPS or localhost) and
// throws "crypto.randomUUID is not a function" over plain HTTP on a real host.
// Fall back to a Math.random()-based UUID v4 when it's unavailable — this is
// used for guest session/address identifiers, not for anything security-sensitive.
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}
