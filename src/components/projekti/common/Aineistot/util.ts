import { SelectOption } from "@components/form/Select";
import { Aineisto, AineistoInput, AineistoInputNew, AineistoNew, AineistoTila, VelhoAineisto } from "@services/api";
import { uuid } from "common/util/uuid";
import { AineistoKategoria, aineistoKategoriat, kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import find from "lodash/find";
import { Translate } from "next-translate";
import { Key } from "react";
import { FieldArrayWithId } from "react-hook-form";

export interface AineistotKategorioittain {
  [kategoriaId: string]: AineistoInput[];
}

export interface AineistoNahtavillaTableFormValuesInterface {
  aineistoNahtavilla: AineistotKategorioittain;
  poistetutAineistoNahtavilla: AineistoInput[];
}

export type FormAineisto = FieldArrayWithId<AineistoNahtavillaTableFormValuesInterface, `aineistoNahtavilla.${string}`, "id"> &
  Pick<Aineisto, "tila" | "tuotu" | "tiedosto">;

export type FormAineistoNew = AineistoInputNew & Pick<AineistoNew, "tuotu" | "tiedosto">;

export function getInitialExpandedAineisto(aineistot: AineistotKategorioittain | { [kategoriaId: string]: AineistoInputNew[] }): Key[] {
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

export function findKategoriaForVelhoAineisto(valitutVelhoAineistot: VelhoAineisto[]): AineistoInput[] {
  return valitutVelhoAineistot.map<AineistoInput>((velhoAineisto) => ({
    dokumenttiOid: velhoAineisto.oid,
    nimi: velhoAineisto.tiedosto,
    kategoriaId: aineistoKategoriat.findKategoria(velhoAineisto.kuvaus, velhoAineisto.tiedosto)?.id,
    tila: AineistoTila.ODOTTAA_TUONTIA,
    uuid: uuid.v4(),
  }));
}

export function findKategoriaForVelhoAineistoNew(valitutVelhoAineistot: VelhoAineisto[]): AineistoInputNew[] {
  return valitutVelhoAineistot.map<AineistoInputNew>((velhoAineisto) => ({
    dokumenttiOid: velhoAineisto.oid,
    nimi: velhoAineisto.tiedosto,
    kategoriaId: aineistoKategoriat.findKategoria(velhoAineisto.kuvaus, velhoAineisto.tiedosto)?.id,
    uuid: uuid.v4(),
  }));
}

export function combineOldAndNewAineistoWithCategories({
  oldAineisto,
  newAineisto,
}: {
  oldAineisto: AineistotKategorioittain;
  newAineisto: AineistoInput[];
}) {
  return newAineisto.reduce((combinedNewAndOld, velhoAineisto) => {
    if (!find(Object.values(combinedNewAndOld).flat(), { dokumenttiOid: velhoAineisto.dokumenttiOid })) {
      if (!velhoAineisto.kategoriaId && !combinedNewAndOld[kategorisoimattomatId]) {
        combinedNewAndOld[kategorisoimattomatId] = [];
      }
      if (velhoAineisto.kategoriaId && !combinedNewAndOld[velhoAineisto.kategoriaId]) {
        combinedNewAndOld[velhoAineisto.kategoriaId] = [];
      }
      const kategorianAineistot = combinedNewAndOld[velhoAineisto.kategoriaId || kategorisoimattomatId];
      kategorianAineistot.push({ ...velhoAineisto, jarjestys: kategorianAineistot.length });
    }
    return combinedNewAndOld;
  }, oldAineisto || {});
}

export function combineOldAndNewAineisto({ oldAineisto, newAineisto }: { oldAineisto?: AineistoInput[]; newAineisto: AineistoInput[] }) {
  return newAineisto.reduce((combinedNewAndOld, velhoAineisto) => {
    if (!find(combinedNewAndOld, { dokumenttiOid: velhoAineisto.dokumenttiOid })) {
      combinedNewAndOld.push({ ...velhoAineisto, jarjestys: combinedNewAndOld.length });
    }
    return combinedNewAndOld;
  }, oldAineisto || []);
}

export function adaptVelhoAineistoToAineistoInput(velhoAineisto: VelhoAineisto): AineistoInput {
  return {
    dokumenttiOid: velhoAineisto.oid,
    nimi: velhoAineisto.tiedosto,
    tila: AineistoTila.ODOTTAA_TUONTIA,
    uuid: uuid.v4(),
  };
}
