export function* chunkArray<T>(arr: T[], stride = 1) {
  for (let i = 0; i < arr.length; i += stride) {
    yield arr.slice(i, Math.min(i + stride, arr.length));
  }
}
