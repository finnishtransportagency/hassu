import { FormAineistoNew } from "@components/projekti/common/Aineistot/util";
import {
  AineistoInputNew,
  AineistoNew,
  EnnakkoNeuvotteluInput,
  HyvaksymisEsityksenTiedot,
  HyvaksymisEsitysInput,
  KunnallinenLadattuTiedosto,
  KunnallinenLadattuTiedostoInput,
  LadattuTiedostoInputNew,
  LadattuTiedostoNew,
  ProjektiTyyppi,
  TallennaEnnakkoNeuvotteluInput,
  TallennaHyvaksymisEsitysInput,
} from "@services/api";
import { getAineistoKategoriat, kategorisoimattomatId } from "common/aineistoKategoriat";

export type FormMuistutukset = { [s: string]: KunnallinenLadattuTiedostoInput[] };
export type HyvaksymisEsitysForm = {
  oid: string;
  versio: number;
  muokattavaHyvaksymisEsitys: Omit<HyvaksymisEsitysInput, "muistutukset" | "suunnitelma"> & {
    muistutukset: FormMuistutukset;
    suunnitelma: { [key: string]: FormAineistoNew[] };
  };
};

export type EnnakkoneuvotteluForm = {
  oid: string;
  versio: number;
  ennakkoNeuvottelu: Omit<EnnakkoNeuvotteluInput, "muistutukset" | "suunnitelma"> & {
    muistutukset: FormMuistutukset;
    suunnitelma: { [key: string]: FormAineistoNew[] };
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
      suunnitelma: adaptSuunnitelmaAineistot(suunnitelma, perustiedot.projektiTyyppi),
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

export function adaptSuunnitelmaAineistot(
  suunnitelma: AineistoNew[] | null | undefined,
  projektiTyyppi: ProjektiTyyppi | null | undefined
): { [key: string]: FormAineistoNew[] } {
  const kategoriaIdt = getAineistoKategoriat({ projektiTyyppi, showKategorisoimattomat: true, hideDeprecated: true }).listKategoriaIds();

  const kategoriat = kategoriaIdt.reduce<{ [key: string]: FormAineistoNew[] }>((acc, kategoriaId) => {
    acc[kategoriaId] = [];
    return acc;
  }, {});

  if (!suunnitelma?.length) {
    return kategoriat;
  }

  return suunnitelma.reduce((kategorisoidutAineistot, aineisto) => {
    const kategoriaId = aineisto.kategoriaId && kategoriaIdt.includes(aineisto.kategoriaId) ? aineisto.kategoriaId : kategorisoimattomatId;
    kategorisoidutAineistot[kategoriaId].push(adaptAineistoNewToInput(aineisto));
    return kategorisoidutAineistot;
  }, kategoriat);
}

export function transformHyvaksymisEsitysFormToTallennaHyvaksymisEsitysInput(
  formData: HyvaksymisEsitysForm
): TallennaHyvaksymisEsitysInput {
  const muistutukset = Object.values(formData.muokattavaHyvaksymisEsitys.muistutukset).flat();
  const suunnitelma = Object.values(formData.muokattavaHyvaksymisEsitys.suunnitelma)
    .flat()
    .map<AineistoInputNew>(({ dokumenttiOid, nimi, uuid, kategoriaId }) => ({ dokumenttiOid, nimi, uuid, kategoriaId }));
  const muuAineistoVelhosta = formData.muokattavaHyvaksymisEsitys.muuAineistoVelhosta?.map<AineistoInputNew>(
    ({ dokumenttiOid, nimi, uuid, kategoriaId }) => ({ dokumenttiOid, nimi, uuid, kategoriaId })
  );
  return {
    ...formData,
    muokattavaHyvaksymisEsitys: {
      ...formData.muokattavaHyvaksymisEsitys,
      suunnitelma,
      muistutukset,
      muuAineistoVelhosta,
    },
  };
}

export function transformToInput(formData: EnnakkoneuvotteluForm, laheta: boolean): TallennaEnnakkoNeuvotteluInput {
  const muistutukset = Object.values(formData.ennakkoNeuvottelu.muistutukset).flat();
  const suunnitelma = Object.values(formData.ennakkoNeuvottelu.suunnitelma)
    .flat()
    .map<AineistoInputNew>(({ dokumenttiOid, nimi, uuid, kategoriaId }) => ({ dokumenttiOid, nimi, uuid, kategoriaId }));
  const muuAineistoVelhosta = formData.ennakkoNeuvottelu.muuAineistoVelhosta?.map<AineistoInputNew>(
    ({ dokumenttiOid, nimi, uuid, kategoriaId }) => ({ dokumenttiOid, nimi, uuid, kategoriaId })
  );

  return {
    ...formData,
    laheta,
    ennakkoNeuvottelu: {
      ...formData.ennakkoNeuvottelu,
      suunnitelma,
      muistutukset,
      muuAineistoVelhosta,
    },
  };
}

export function adaptLadatutTiedostotNewToInput(ladatutTiedostot: LadattuTiedostoNew[] | undefined | null): LadattuTiedostoInputNew[] {
  if (!ladatutTiedostot) {
    return [];
  }
  return ladatutTiedostot.map(adaptLadattuTiedostoNewToInput);
}

export function adaptLadattuTiedostoNewToInput(ladattuTiedosto: LadattuTiedostoNew): LadattuTiedostoInputNew {
  const { nimi, uuid } = ladattuTiedosto;
  return {
    nimi,
    uuid,
  };
}

export function adaptKunnallinenLadattuTiedostoToInput(ladattuTiedosto: KunnallinenLadattuTiedosto): KunnallinenLadattuTiedostoInput {
  const { nimi, uuid, kunta } = ladattuTiedosto;
  return {
    nimi,
    uuid,
    kunta,
  };
}

export function adaptAineistotNewToInput(aineistot: AineistoNew[] | undefined | null): AineistoInputNew[] {
  if (!aineistot) {
    return [];
  }
  return aineistot.map(adaptAineistoNewToInput);
}

function adaptAineistoNewToInput(aineisto: AineistoNew): FormAineistoNew {
  const { dokumenttiOid, uuid, kategoriaId, nimi, tiedosto, tuotu, lisatty } = aineisto;
  return {
    dokumenttiOid,
    uuid,
    kategoriaId,
    nimi,
    tuotu: tuotu && lisatty ? lisatty : undefined,
    tiedosto,
  };
}
