import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";

type TitlesAndPaatos = {
  sectionTitle: string;
  sectionInfoText: string;
  dialogInfoText: string;
  sectionSubtitle: string;
  paatos: {
    paatosInfoText: string;
    paatosSubtitle: string;
  };
};

const hyvaksymisPaatosSuunnitelmatJaAineistotProps: TitlesAndPaatos = {
  sectionTitle: "Päätös ja päätöksen liitteenä oleva aineisto",
  sectionInfoText:
    "Liitä Liikenne- ja viestintävirasto Traficomin tekemä hyväksymispäätös. Jos päätöksestä on toimitettu kaksi versiota, lisää ei-henkilötietoja sisältävä kuulutusversio. Liitettävä päätös haetaan Projektivelhosta. Päätös ja sen liitteenä oleva aineisto julkaistaan palvelun julkisella puolella kuulutuksen julkaisupäivänä.",
  dialogInfoText: "Valitse tiedostot, jotka haluat tuoda päätöksen liitteeksi.",
  sectionSubtitle: "Päätöksen liitteenä oleva aineisto",
  paatos: {
    paatosInfoText:
      "Liitä Liikenne- ja viestintäviraston päätös. Päätöksen päivämäärä sekä asiatunnus löytyvät Kuulutuksen tiedot -välilehdellä, jos ne on lisätty Käsittelyn tila -sivulle.",
    paatosSubtitle: "Päätös *",
  },
};

const jatkopaatosPaatosSuunnitelmatProps: TitlesAndPaatos = {
  ...hyvaksymisPaatosSuunnitelmatJaAineistotProps,
  sectionInfoText:
    "Liitä kuulutukselle Liikenne- ja viestintäviraston päätös sekä jatkopäätös. Liitettävät päätökset sekä päätösten liitteenä olevat aineistot haetaan Projektivelhosta. Päätökset ja sen liitteenä oleva aineisto julkaistaan palvelun julkisella puolella kuulutuksen julkaisupäivänä.",
  paatos: {
    paatosSubtitle: "Päätös ja jatkopäätös *",
    paatosInfoText:
      "Liitä Liikenne- ja viestintäviraston päätökset suunnitelman hyväksymisestä sekä päätös suunnitelman voimassaoloajan pidentämisestä. Jatkopäätöksen päivämäärä sekä asiatunnus löytyvät automaattisesti Kuulutuksen tiedot -välilehdeltä.",
  },
};

const paatosTyyppiToSuunnitelmatJaAineistotPropsMap: Record<PaatosTyyppi, TitlesAndPaatos> = {
  HYVAKSYMISPAATOS: hyvaksymisPaatosSuunnitelmatJaAineistotProps,
  JATKOPAATOS1: jatkopaatosPaatosSuunnitelmatProps,
  JATKOPAATOS2: jatkopaatosPaatosSuunnitelmatProps,
};

export function getSectionTitle(paatosTyyppi: PaatosTyyppi) {
  return paatosTyyppiToSuunnitelmatJaAineistotPropsMap[paatosTyyppi].sectionTitle;
}

export function getSectionInfoText(paatosTyyppi: PaatosTyyppi) {
  return paatosTyyppiToSuunnitelmatJaAineistotPropsMap[paatosTyyppi].sectionInfoText;
}

export function getDialogInfoText(paatosTyyppi: PaatosTyyppi) {
  return paatosTyyppiToSuunnitelmatJaAineistotPropsMap[paatosTyyppi].dialogInfoText;
}

export function getSectionSubtitle(paatosTyyppi: PaatosTyyppi) {
  return paatosTyyppiToSuunnitelmatJaAineistotPropsMap[paatosTyyppi].sectionSubtitle;
}

export function getPaatosInfoText(paatosTyyppi: PaatosTyyppi) {
  return paatosTyyppiToSuunnitelmatJaAineistotPropsMap[paatosTyyppi].paatos.paatosInfoText;
}

export function getPaatosSubtitle(paatosTyyppi: PaatosTyyppi) {
  return paatosTyyppiToSuunnitelmatJaAineistotPropsMap[paatosTyyppi].paatos.paatosSubtitle;
}
