function v4From(getRandomValues: (arr: Uint8Array) => Uint8Array): string {
  const bytes = getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

let generator: (() => string) | null = null;

export function newUuid(): string {
  if (!generator) {
    const crypto = globalThis.crypto as { getRandomValues?: (arr: Uint8Array) => Uint8Array };
    if (crypto && typeof crypto.getRandomValues === "function") {
      const getRandomValues = crypto.getRandomValues.bind(crypto);
      generator = () => v4From(getRandomValues);
    } else {
      const expoCrypto = require("expo-crypto") as { randomUUID: () => string };
      generator = () => expoCrypto.randomUUID();
    }
  }
  return generator();
}