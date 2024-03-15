export function formatKiinteistotunnus(tunnus: string) {
  return `${Number(tunnus.substring(0, 3))}-${Number(tunnus.substring(3, 6))}-${Number(tunnus.substring(6, 10))}-${Number(
    tunnus.substring(10)
  )}`;
}
