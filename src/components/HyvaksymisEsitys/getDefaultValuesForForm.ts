import {
  AineistoInputNew,
  AineistoNew,
  HyvaksymisEsityksenTiedot,
  KunnallinenLadattuTiedosto,
  KunnallinenLadattuTiedostoInput,
  LadattuTiedostoInputNew,
  LadattuTiedostoNew,
  TallennaHyvaksymisEsitysInput,
} from "@services/api";

export default function getDefaultValuesForForm(hyvaksymisEsityksenTiedot: HyvaksymisEsityksenTiedot): TallennaHyvaksymisEsitysInput {
  const { oid, versio, hyvaksymisEsitys: muokattavaHyvaksymisEsitys } = hyvaksymisEsityksenTiedot;

  if (!muokattavaHyvaksymisEsitys) {
    return {
      oid,
      versio,
      muokattavaHyvaksymisEsitys: {
        poistumisPaiva: "",
      },
    };
  }
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
  } = muokattavaHyvaksymisEsitys;
  const { yTunnus, ovtTunnus, verkkolaskuoperaattorinTunnus, viitetieto } = laskutustiedot ?? {};
  return {
    oid,
    versio,
    muokattavaHyvaksymisEsitys: {
      poistumisPaiva: poistumisPaiva ?? "",
      kiireellinen: kiireellinen ?? false,
      lisatiedot: lisatiedot ?? "",
      laskutustiedot: {
        yTunnus,
        ovtTunnus,
        verkkolaskuoperaattorinTunnus,
        viitetieto,
      },
      hyvaksymisEsitys: adaptLadatutTiedostotNewToInput(hyvaksymisEsitys),
      suunnitelma: adaptAineistotNewToInput(suunnitelma),
      muistutukset: adaptKunnallisetLadatutTiedostoToInput(muistutukset),
      lausunnot: adaptLadatutTiedostotNewToInput(lausunnot),
      kuulutuksetJaKutsu: adaptLadatutTiedostotNewToInput(kuulutuksetJaKutsu),
      muuAineistoVelhosta: adaptAineistotNewToInput(muuAineistoVelhosta),
      muuAineistoKoneelta: adaptLadatutTiedostotNewToInput(muuAineistoKoneelta),
      maanomistajaluettelo: adaptLadatutTiedostotNewToInput(maanomistajaluettelo),
      vastaanottajat: vastaanottajat?.map(({ sahkoposti }) => sahkoposti) ?? [],
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
  const { nimi, uuid, jarjestys } = ladattuTiedosto;
  return {
    nimi,
    uuid,
    jarjestys,
  };
}

function adaptKunnallisetLadatutTiedostoToInput(
  ladatutTiedostot: KunnallinenLadattuTiedosto[] | undefined | null
): KunnallinenLadattuTiedostoInput[] {
  if (!ladatutTiedostot) {
    return [];
  }
  return ladatutTiedostot.map(adaptKunnallinenLadattuTiedostoToInput);
}

function adaptKunnallinenLadattuTiedostoToInput(ladattuTiedosto: KunnallinenLadattuTiedosto): KunnallinenLadattuTiedostoInput {
  const { nimi, uuid, jarjestys, kunta } = ladattuTiedosto;
  return {
    nimi,
    uuid,
    jarjestys,
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
  const { dokumenttiOid, uuid, kategoriaId, nimi, jarjestys } = aineisto;
  return {
    dokumenttiOid,
    uuid,
    kategoriaId,
    nimi,
    jarjestys,
  };
}
