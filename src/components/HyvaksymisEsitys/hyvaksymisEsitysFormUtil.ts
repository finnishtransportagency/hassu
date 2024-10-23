import { FormAineistoNew } from "@components/projekti/common/Aineistot/util";
import {
  AineistoInputNew,
  AineistoNew,
  HyvaksymisEsityksenTiedot,
  HyvaksymisEsitysInput,
  KunnallinenLadattuTiedosto,
  KunnallinenLadattuTiedostoInput,
  LadattuTiedostoInputNew,
  LadattuTiedostoNew,
  ProjektiTyyppi,
  TallennaHyvaksymisEsitysInput,
} from "@services/api";
import { getAineistoKategoriat, kategorisoimattomatId } from "common/aineistoKategoriat";

export type FormMuistutukset = { [s: string]: KunnallinenLadattuTiedostoInput[] };
export type HyvaksymisEsitysForm = {
  oid: string;
  versio: number;
  muokattavaHyvaksymisEsitys: Omit<
    HyvaksymisEsitysInput,
    | "muistutukset"
    | "suunnitelma"
    | "hyvaksymisEsitys"
    | "kuulutuksetJaKutsu"
    | "muuAineistoKoneelta"
    | "maanomistajaluettelo"
    | "lausunnot"
  > & {
    muistutukset: FormMuistutukset;
    hyvaksymisEsitys: LadattuTiedostoNew[];
    kuulutuksetJaKutsu: LadattuTiedostoNew[];
    muuAineistoKoneelta: LadattuTiedostoNew[];
    maanomistajaluettelo: LadattuTiedostoNew[];
    lausunnot: LadattuTiedostoNew[];
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
      hyvaksymisEsitys: hyvaksymisEsitys ?? [],
      suunnitelma: adaptSuunnitelmaAineistot(suunnitelma, perustiedot.projektiTyyppi),
      muistutukset: muistutuksetSorted,
      lausunnot: lausunnot ?? [],
      kuulutuksetJaKutsu: kuulutuksetJaKutsu ?? [],
      muuAineistoVelhosta: adaptAineistotNewToInput(muuAineistoVelhosta),
      muuAineistoKoneelta: muuAineistoKoneelta ?? [],
      maanomistajaluettelo: maanomistajaluettelo ?? [],
      vastaanottajat: vastaanottajat?.length
        ? vastaanottajat.map(({ sahkoposti }) => ({ sahkoposti }))
        : [{ sahkoposti: "kirjaamo@traficom.fi" }],
    },
  };
}

function adaptSuunnitelmaAineistot(
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

export function transformHyvaksymisEsitysFormToTallennaHyvaksymisEsitysInput({
  oid,
  versio,
  muokattavaHyvaksymisEsitys,
}: HyvaksymisEsitysForm): TallennaHyvaksymisEsitysInput {
  const {
    hyvaksymisEsitys,
    kuulutuksetJaKutsu,
    muuAineistoKoneelta,
    maanomistajaluettelo,
    lausunnot,
    suunnitelma,
    muistutukset,
    muuAineistoVelhosta,
  } = muokattavaHyvaksymisEsitys;

  const flatMuistutukset = Object.values(muistutukset).flat();
  const flatSuunnitelma = Object.values(suunnitelma)
    .flat()
    .map<AineistoInputNew>(({ dokumenttiOid, nimi, uuid, kategoriaId }) => ({ dokumenttiOid, nimi, uuid, kategoriaId }));
  const flatMuuAineistoVelhosta = muuAineistoVelhosta?.map<AineistoInputNew>(({ dokumenttiOid, nimi, uuid, kategoriaId }) => ({
    dokumenttiOid,
    nimi,
    uuid,
    kategoriaId,
  }));
  return {
    oid,
    versio,
    muokattavaHyvaksymisEsitys: {
      ...muokattavaHyvaksymisEsitys,
      hyvaksymisEsitys: adaptLadatutTiedostotNewToInput(hyvaksymisEsitys),
      kuulutuksetJaKutsu: adaptLadatutTiedostotNewToInput(kuulutuksetJaKutsu),
      muuAineistoKoneelta: adaptLadatutTiedostotNewToInput(muuAineistoKoneelta),
      maanomistajaluettelo: adaptLadatutTiedostotNewToInput(maanomistajaluettelo),
      lausunnot: adaptLadatutTiedostotNewToInput(lausunnot),
      suunnitelma: flatSuunnitelma,
      muistutukset: flatMuistutukset,
      muuAineistoVelhosta: flatMuuAineistoVelhosta,
    },
  };
}

function adaptLadatutTiedostotNewToInput(ladatutTiedostot: LadattuTiedostoNew[] | undefined | null): LadattuTiedostoInputNew[] {
  if (!ladatutTiedostot) {
    return [];
  }
  return ladatutTiedostot.map<LadattuTiedostoInputNew>(({ nimi, tiedosto, uuid }) => ({ nimi, tiedosto, uuid }));
}

function adaptKunnallinenLadattuTiedostoToInput(ladattuTiedosto: KunnallinenLadattuTiedosto): KunnallinenLadattuTiedostoInput {
  const { nimi, uuid, kunta } = ladattuTiedosto;
  return {
    nimi,
    uuid,
    kunta,
  };
}

function adaptAineistotNewToInput(aineistot: AineistoNew[] | undefined | null): FormAineistoNew[] {
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
