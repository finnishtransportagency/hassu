export function getId(
  vaihe:
    | {
        id: number | undefined;
      }
    | undefined
    | null
): number {
  let id = vaihe?.id;
  if (!id) {
    id = 1;
  }
  return id;
}
