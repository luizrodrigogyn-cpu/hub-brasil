const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAcceptedImageType(type: string) {
  return acceptedImageTypes.has(type);
}

export async function matchesImageSignature(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const bytes = (...values: number[]) => values.every((value, index) => header[index] === value);
  if (file.type === "image/jpeg") return bytes(0xff, 0xd8, 0xff);
  if (file.type === "image/png") return bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (file.type === "image/webp") return bytes(0x52, 0x49, 0x46, 0x46) && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  return false;
}
