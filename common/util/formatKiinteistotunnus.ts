export function formatKiinteistotunnusForDisplay(tunnus: string) {
  return `${Number(tunnus.substring(0, 3))}-${Number(tunnus.substring(3, 6))}-${Number(tunnus.substring(6, 10))}-${Number(
    tunnus.substring(10)
  )}`;
}

export function formatKiinteistotunnusForDatabase(tunnus: string): string {
  const osienPituudet = [3, 3, 4, 4];
  const tunnusosat = tunnus.split("-");
  if (tunnusosat.length !== osienPituudet.length && tunnusosat.every((osa) => !isNaN(+osa))) {
    throw Error("Virheellinen kiinteistötunnus");
  }
  return osienPituudet.map<string>((osanPituus, index) => tunnusosat[index].padStart(osanPituus, "0")).join("");
}
