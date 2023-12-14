import { Aineisto } from "./graphql/apiModel";

export enum VuorovaikutusAineistoKategoria {
  ESITTELYAINEISTO = "ESITTELYAINEISTO",
  SUUNNITELMALUONNOS = "SUUNNITELMALUONNOS",
}

export function haeKategorianAineistot<T extends Pick<Aineisto, "kategoriaId">>(
  aineistot: T[] | null | undefined,
  kategoria: VuorovaikutusAineistoKategoria
): T[] | null | undefined {
  return aineistot?.filter((aineisto) => aineisto.kategoriaId === kategoria);
}

export type JaoteltuVuorovaikutusAineisto<T extends Pick<Aineisto, "kategoriaId">> = {
  esittelyaineistot?: T[] | null;
  suunnitelmaluonnokset?: T[] | null;
};

export function jaotteleVuorovaikutusAineistot<T extends Pick<Aineisto, "kategoriaId">>(
  aineistot: T[] | null | undefined
): JaoteltuVuorovaikutusAineisto<T> {
  return (
    aineistot?.reduce<JaoteltuVuorovaikutusAineisto<T>>((jaoteltuAineisto, aineisto) => {
      if (aineisto.kategoriaId === VuorovaikutusAineistoKategoria.ESITTELYAINEISTO) {
        if (!jaoteltuAineisto.esittelyaineistot) {
          jaoteltuAineisto.esittelyaineistot = [];
        }
        jaoteltuAineisto.esittelyaineistot.push(aineisto);
      } else if (aineisto.kategoriaId === VuorovaikutusAineistoKategoria.SUUNNITELMALUONNOS) {
        if (!jaoteltuAineisto.suunnitelmaluonnokset) {
          jaoteltuAineisto.suunnitelmaluonnokset = [];
        }
        jaoteltuAineisto.suunnitelmaluonnokset.push(aineisto);
      }
      return jaoteltuAineisto;
    }, {}) ?? {}
  );
}

export function yhdistaVuorovaikutusAineistot<T extends Pick<Aineisto, "kategoriaId">>({
  esittelyaineistot,
  suunnitelmaluonnokset,
}: JaoteltuVuorovaikutusAineisto<T>): T[] | null | undefined {
  if (!esittelyaineistot && !suunnitelmaluonnokset) {
    return undefined;
  }
  const esittelyaineistotKategorialla =
    esittelyaineistot?.map((aineisto) => ({ ...aineisto, kategoriaId: VuorovaikutusAineistoKategoria.ESITTELYAINEISTO })) ?? [];
  const suunnitelmaluonnoksetKategorialla =
    suunnitelmaluonnokset?.map((aineisto) => ({ ...aineisto, kategoriaId: VuorovaikutusAineistoKategoria.SUUNNITELMALUONNOS })) ?? [];
  return [...esittelyaineistotKategorialla, ...suunnitelmaluonnoksetKategorialla];
}
