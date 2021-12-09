export function produceAWSClient(name: string, p: () => any) {
  const key = "produceAWSClient_" + name;
  if (!globalThis[key]) {
    globalThis[key] = p();
  }
  return globalThis[key];
}
