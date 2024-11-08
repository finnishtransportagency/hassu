import { SelectOption } from "@components/form/Select";
import { AineistoInputNew, AineistoNew, AineistoTila, VelhoAineisto } from "@services/api";
import { uuid } from "common/util/uuid";
import { AineistoKategoria, AineistoKategoriat, kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import find from "lodash/find";
import { Translate } from "next-translate";
import { Key } from "react";
import { FormAineisto } from "src/util/FormAineisto";

export interface AineistotKategorioittain {
  [kategoriaId: string]: FormAineisto[];
}

export interface AineistoNahtavillaTableFormValuesInterface {
  aineistoNahtavilla: AineistotKategorioittain;
  poistetutAineistoNahtavilla: FormAineisto[];
}

export type FormAineistoNew = AineistoInputNew & Pick<AineistoNew, "tiedosto"> & { tuotu: string | undefined; newlyAdded?: boolean };

export function getInitialExpandedAineisto(aineistot: AineistotKategorioittain | { [kategoriaId: string]: FormAineistoNew[] }): Key[] {
  const keyArray = [];
  const hasKategorisoimattomatAineisto = !!aineistot?.[kategorisoimattomatId]?.length;
  if (hasKategorisoimattomatAineisto) {
    keyArray.push(kategorisoimattomatId);
  }
  return keyArray;
}

export function getAllOptionsForKategoriat({
  kategoriat,
  ylakategoriaNimi,
  t,
}: {
  kategoriat: AineistoKategoria[];
  ylakategoriaNimi?: string;
  t: Translate;
}) {
  const ylakategoriaPrefix = ylakategoriaNimi ? `${ylakategoriaNimi} - ` : "";
  const kategoriaIds: SelectOption[] = [];
  kategoriat.forEach((kategoria) => {
    kategoriaIds.push({
      label: ylakategoriaPrefix + t(`aineisto-kategoria-nimi.${kategoria.id}`),
      value: kategoria.id,
    });
    if (kategoria.alaKategoriat) {
      kategoriaIds.push(
        ...getAllOptionsForKategoriat({
          kategoriat: kategoria.alaKategoriat,
          ylakategoriaNimi: ylakategoriaPrefix + t(`aineisto-kategoria-nimi.${kategoria.id}`),
          t,
        })
      );
    }
  });
  return kategoriaIds;
}

export function findKategoriaForVelhoAineisto(
  valitutVelhoAineistot: VelhoAineisto[],
  aineistoKategoriat: AineistoKategoriat
): FormAineisto[] {
  return valitutVelhoAineistot.map<FormAineisto>((velhoAineisto) => ({
    dokumenttiOid: velhoAineisto.oid,
    nimi: velhoAineisto.tiedosto,
    kategoriaId: aineistoKategoriat.findKategoria(velhoAineisto.kuvaus, velhoAineisto.tiedosto)?.id,
    tila: null,
    uuid: uuid.v4(),
  }));
}

export function findKategoriaForVelhoAineistoNew(
  valitutVelhoAineistot: VelhoAineisto[],
  aineistoKategoriat: AineistoKategoriat
): FormAineistoNew[] {
  return valitutVelhoAineistot.map<FormAineistoNew>((velhoAineisto) => ({
    dokumenttiOid: velhoAineisto.oid,
    nimi: velhoAineisto.tiedosto,
    kategoriaId: aineistoKategoriat.findKategoria(velhoAineisto.kuvaus, velhoAineisto.tiedosto)?.id,
    uuid: uuid.v4(),
    tuotu: undefined,
    tiedosto: undefined,
    newlyAdded: true,
  }));
}

export function combineOldAndNewAineistoWithCategories({
  oldAineisto,
  newAineisto,
}: {
  oldAineisto: AineistotKategorioittain;
  newAineisto: FormAineisto[];
}) {
  return newAineisto.reduce((combinedNewAndOld, velhoAineisto) => {
    if (!find(Object.values(combinedNewAndOld).flat(), { dokumenttiOid: velhoAineisto.dokumenttiOid })) {
      if (!velhoAineisto.kategoriaId && !combinedNewAndOld[kategorisoimattomatId]) {
        combinedNewAndOld[kategorisoimattomatId] = [];
      }
      if (velhoAineisto.kategoriaId && !combinedNewAndOld[velhoAineisto.kategoriaId]) {
        combinedNewAndOld[velhoAineisto.kategoriaId] = [];
      }
      const kategorianAineistot = combinedNewAndOld[velhoAineisto.kategoriaId ?? kategorisoimattomatId];
      kategorianAineistot.push({ ...velhoAineisto, jarjestys: kategorianAineistot.length });
    }
    return combinedNewAndOld;
  }, oldAineisto || {});
}

export function combineOldAndNewAineisto({ oldAineisto, newAineisto }: { oldAineisto?: FormAineisto[]; newAineisto: FormAineisto[] }) {
  return newAineisto.reduce((combinedNewAndOld, velhoAineisto) => {
    if (!find(combinedNewAndOld, { dokumenttiOid: velhoAineisto.dokumenttiOid })) {
      combinedNewAndOld.push({ ...velhoAineisto, jarjestys: combinedNewAndOld.length });
    }
    return combinedNewAndOld;
  }, oldAineisto || []);
}

export const adaptVelhoAineistoToAineistoInput = (velhoAineisto: VelhoAineisto): FormAineisto => ({
  dokumenttiOid: velhoAineisto.oid,
  nimi: velhoAineisto.tiedosto,
  tila: AineistoTila.ODOTTAA_TUONTIA,
  uuid: uuid.v4(),
  koko: velhoAineisto.koko,
});
