import { SelectOption } from "@components/form/Select";
import { Aineisto, AineistoInput, VelhoAineisto } from "@services/api";
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

export function getInitialExpandedAineisto(aineistot: AineistotKategorioittain): Key[] {
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
  }));
}

export function combineOldAndNewAineistoWithCategories({
  oldAineisto,
  oldPoistetut,
  newAineisto,
}: {
  oldAineisto: AineistotKategorioittain;
  oldPoistetut: AineistoInput[];
  newAineisto: AineistoInput[];
}) {
  return newAineisto.reduce<{ lisatyt: AineistotKategorioittain; poistetut: AineistoInput[] }>(
    (acc, velhoAineisto) => {
      if (!find(Object.values(acc.lisatyt || {}).flat(), { dokumenttiOid: velhoAineisto.dokumenttiOid })) {
        if (!velhoAineisto.kategoriaId && !acc.lisatyt[kategorisoimattomatId]) {
          acc.lisatyt[kategorisoimattomatId] = [];
        }
        if (velhoAineisto.kategoriaId && !acc.lisatyt[velhoAineisto.kategoriaId]) {
          acc.lisatyt[velhoAineisto.kategoriaId] = [];
        }
        const kategorianAineistot = acc.lisatyt[velhoAineisto.kategoriaId || kategorisoimattomatId];
        kategorianAineistot.push({ ...velhoAineisto, jarjestys: kategorianAineistot.length });
      }
      acc.poistetut = acc.poistetut.filter((poistettu) => poistettu.dokumenttiOid !== velhoAineisto.dokumenttiOid);
      return acc;
    },
    { lisatyt: oldAineisto || {}, poistetut: oldPoistetut || [] }
  );
}

export function combineOldAndNewAineisto({
  oldAineisto,
  oldPoistetut,
  newAineisto,
}: {
  oldAineisto?: AineistoInput[];
  oldPoistetut?: AineistoInput[];
  newAineisto: AineistoInput[];
}) {
  return newAineisto.reduce<{ lisatyt: AineistoInput[]; poistetut: AineistoInput[] }>(
    (acc, velhoAineisto) => {
      if (!find(acc.lisatyt, { dokumenttiOid: velhoAineisto.dokumenttiOid })) {
        acc.lisatyt.push({ ...velhoAineisto, jarjestys: acc.lisatyt.length });
      }
      acc.poistetut = acc.poistetut.filter((poistettu) => poistettu.dokumenttiOid !== velhoAineisto.dokumenttiOid);
      return acc;
    },
    { lisatyt: oldAineisto || [], poistetut: oldPoistetut || [] }
  );
}

export function adaptVelhoAineistoToAineistoInput(velhoAineisto: VelhoAineisto): AineistoInput {
  return {
    dokumenttiOid: velhoAineisto.oid,
    nimi: velhoAineisto.tiedosto,
  };
}
