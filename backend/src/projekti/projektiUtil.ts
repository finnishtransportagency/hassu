import { DBVaylaUser } from "../database/model";

export function findJulkaisutWithTila<J, T>(julkaisut: (J & { tila?: T })[] | undefined | null, tila: T): J[] | undefined {
  return julkaisut?.filter((julkaisu) => julkaisu.tila == tila);
}

export function findJulkaisuWithTila<J, T>(julkaisut: (J & { tila?: T })[] | undefined | null, tila: T): J | undefined {
  return findJulkaisutWithTila(julkaisut, tila)?.pop();
}

export function findJulkaisuWithId<J>(julkaisut: (J & { id?: number })[] | undefined | null, id: number): J | undefined {
  return julkaisut?.filter((julkaisu) => julkaisu.id == id).pop();
}

export function findUserByKayttajatunnus(kayttoOikeudet: DBVaylaUser[], kayttajatunnus: string | undefined): DBVaylaUser | undefined {
  if (!kayttajatunnus) {
    return undefined;
  }
  return kayttoOikeudet.find((value) => value.kayttajatunnus == kayttajatunnus);
}
