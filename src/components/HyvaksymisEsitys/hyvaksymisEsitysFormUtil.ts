import {
  AineistoInputNew,
  AineistoNew,
  HyvaksymisEsityksenTiedot,
  HyvaksymisEsitysInput,
  KunnallinenLadattuTiedosto,
  KunnallinenLadattuTiedostoInput,
  LadattuTiedostoInputNew,
  LadattuTiedostoNew,
} from "@services/api";

export type FormMuistutukset = { [s: string]: KunnallinenLadattuTiedostoInput[] | null };
export type HyvaksymisEsitysForm = {
  oid: string;
  versio: number;
  muokattavaHyvaksymisEsitys: Omit<HyvaksymisEsitysInput, "muistutukset"> & {
    muistutukset: FormMuistutukset;
  };
};

export function getDefaultValuesForForm(hyvaksymisEsityksenTiedot: HyvaksymisEsityksenTiedot): HyvaksymisEsitysForm {
  const { oid, versio, hyvaksymisEsitys: muokattavaHyvaksymisEsitys, perustiedot } = hyvaksymisEsityksenTiedot;

  const {
    poistumisPaiva,
    kiireellinen,
    lisatiedot,
    laskutustiedot,
    hyvaksymisEsitys,
    suunnitelma,
    muistutukset,
    lausunnot,
    kuulutuksetJaKutsu,
    muuAineistoVelhosta,
    muuAineistoKoneelta,
    maanomistajaluettelo,
    vastaanottajat,
  } = muokattavaHyvaksymisEsitys ?? {};
  const { ovtTunnus, verkkolaskuoperaattorinTunnus, viitetieto } = laskutustiedot ?? {};
  const muistutuksetSorted =
    perustiedot.kunnat?.reduce((acc, kunta) => {
      acc[kunta] = [];
      return acc;
    }, {} as FormMuistutukset) ?? {};
  muistutukset?.forEach((muistutus) => {
    muistutuksetSorted[muistutus.kunta]?.push(adaptKunnallinenLadattuTiedostoToInput(muistutus));
  });
  return {
    oid,
    versio,
    muokattavaHyvaksymisEsitys: {
      poistumisPaiva: poistumisPaiva ?? null,
      kiireellinen: !!kiireellinen,
      lisatiedot: lisatiedot ?? "",
      laskutustiedot: {
        ovtTunnus: ovtTunnus ?? "",
        verkkolaskuoperaattorinTunnus: verkkolaskuoperaattorinTunnus ?? "",
        viitetieto: viitetieto ?? "",
      },
      hyvaksymisEsitys: adaptLadatutTiedostotNewToInput(hyvaksymisEsitys),
      suunnitelma: adaptAineistotNewToInput(suunnitelma),
      muistutukset: muistutuksetSorted,
      lausunnot: adaptLadatutTiedostotNewToInput(lausunnot),
      kuulutuksetJaKutsu: adaptLadatutTiedostotNewToInput(kuulutuksetJaKutsu),
      muuAineistoVelhosta: adaptAineistotNewToInput(muuAineistoVelhosta),
      muuAineistoKoneelta: adaptLadatutTiedostotNewToInput(muuAineistoKoneelta),
      maanomistajaluettelo: adaptLadatutTiedostotNewToInput(maanomistajaluettelo),
      vastaanottajat: vastaanottajat?.length
        ? vastaanottajat.map(({ sahkoposti }) => ({ sahkoposti }))
        : [{ sahkoposti: "kirjaamo@traficom.fi" }],
    },
  };
}

export function transformHyvaksymisEsitysFormToTallennaHyvaksymisEsitysInput(formData: HyvaksymisEsitysForm) {
  const muistutukset = formData.muokattavaHyvaksymisEsitys.muistutukset;
  return {
    ...formData,
    muokattavaHyvaksymisEsitys: {
      ...formData.muokattavaHyvaksymisEsitys,
      muistutukset: muistutukset
        ? Object.keys(muistutukset).reduce((acc, key) => {
            return acc.concat(muistutukset[key] ?? []);
          }, [] as KunnallinenLadattuTiedostoInput[])
        : [],
    },
  };
}

function adaptLadatutTiedostotNewToInput(ladatutTiedostot: LadattuTiedostoNew[] | undefined | null): LadattuTiedostoInputNew[] {
  if (!ladatutTiedostot) {
    return [];
  }
  return ladatutTiedostot.map(adaptLadattuTiedostoNewToInput);
}

function adaptLadattuTiedostoNewToInput(ladattuTiedosto: LadattuTiedostoNew): LadattuTiedostoInputNew {
  const { nimi, uuid } = ladattuTiedosto;
  return {
    nimi,
    uuid,
  };
}

function adaptKunnallinenLadattuTiedostoToInput(ladattuTiedosto: KunnallinenLadattuTiedosto): KunnallinenLadattuTiedostoInput {
  const { nimi, uuid, kunta } = ladattuTiedosto;
  return {
    nimi,
    uuid,
    kunta,
  };
}

function adaptAineistotNewToInput(aineistot: AineistoNew[] | undefined | null): AineistoInputNew[] {
  if (!aineistot) {
    return [];
  }
  return aineistot.map(adaptAineistoNewToInput);
}

function adaptAineistoNewToInput(aineisto: AineistoNew): AineistoInputNew {
  const { dokumenttiOid, uuid, kategoriaId, nimi } = aineisto;
  return {
    dokumenttiOid,
    uuid,
    kategoriaId,
    nimi,
  };
}
