/**
 * Format bytes as human-readable text.
 *
 * @param bytes Number of bytes.
 * @param lang Language fi / sv.
 * @param dp Number of decimal places to display.
 *
 * @return Formatted string.
 */
export function byteFileSizeToHumanString(bytes: number, lang: "fi" | "sv" = "fi", dp = 1) {
  const thresh = 1024;
  const localizedUnit = lang === "fi" ? "t" : "B";

  if (Math.abs(bytes) < thresh) {
    return bytes + " " + localizedUnit;
  }

  const unitVolumes = ["k", "M", "G", "T", "P", "E", "Z", "Y"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < unitVolumes.length - 1);

  return parseFloat(bytes.toFixed(dp)).toString().replace(".", ",") + " " + unitVolumes[u] + localizedUnit;
}
