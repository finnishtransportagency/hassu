import { wrapXRayCaptureAWSClient } from "./monitoring";

export function produce<T extends { middlewareStack: { remove: any; use: any }; config: any }>(
  name: string,
  p: () => T,
  override = false
): T {
  const key = "produce_" + name;
  if (!(globalThis as any)[key] || override) {
    const client = p();
    try {
      (globalThis as any)[key] = wrapXRayCaptureAWSClient(client);
    } catch (ignore) {
      (globalThis as any)[key] = client;
    }
  }
  return (globalThis as any)[key];
}
