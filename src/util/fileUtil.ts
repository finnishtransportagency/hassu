export function splitFilePath(path?: string) {
  if (!path) {
    return {};
  }
  const fileName = path.replace(/.*\//, "").replace(/\.\w+$/, "");
  const fileExt = path.replace(/.*\./, "");
  return { path, fileName, fileExt };
}
