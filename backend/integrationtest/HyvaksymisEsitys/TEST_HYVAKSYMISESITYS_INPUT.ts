import * as API from "hassu-common/graphql/apiModel";

const TEST_HYVAKSYMISESITYS_INPUT: Readonly<API.HyvaksymisEsitysInput> = getHyvaksymisEsitysInput();
export const TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO: Readonly<API.HyvaksymisEsitysInput> = getHyvaksymisEsitysInput(false);

function getHyvaksymisEsitysInput(includeTiedosto = true): Readonly<API.HyvaksymisEsitysInput> {
  return {
    poistumisPaiva: "2033-01-01",
    hyvaksymisEsitys: [
      {
        tiedosto: includeTiedosto ? "hyvaksymisEsitys/hyvaksymisEsitys_aoa_.png" : undefined,
        nimi: "hyvaksymisEsitys äöå .png",
        uuid: "hyvaksymis-esitys-uuid",
      },
    ],
    suunnitelma: [
      {
        dokumenttiOid: "suunnitelmaDokumenttiOid",
        nimi: "suunnitelma äöå .png",
        uuid: "suunnitelma-uuid",
      },
    ],
    kiireellinen: true,
    lisatiedot: "Lisätietoja",
    laskutustiedot: {
      ovtTunnus: "ovtTunnus",
      verkkolaskuoperaattorinTunnus: "verkkolaskuoperaattorinTunnus",
      viitetieto: "viitetieto",
    },
    muistutukset: [
      {
        kunta: 1,
        tiedosto: includeTiedosto ? "muistutukset/muistutukset_aoa_.png" : undefined,
        nimi: "muistutukset äöå .png",
        uuid: "muistutukset-uuid",
      },
    ],
    lausunnot: [
      {
        tiedosto: includeTiedosto ? "lausunnot/lausunnot_aoa_.png" : undefined,
        nimi: "lausunnot äöå .png",
        uuid: "lausunnot-uuid",
      },
    ],
    maanomistajaluettelo: [
      {
        tiedosto: includeTiedosto ? "maanomistajaluettelo/maanomistajaluettelo_aoa_.png" : undefined,
        nimi: "maanomistajaluettelo äöå .png",
        uuid: "maanomistajaluettelo-uuid",
      },
    ],
    kuulutuksetJaKutsu: [
      {
        tiedosto: includeTiedosto ? "kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_.png" : undefined,
        nimi: "kuulutuksetJaKutsu äöå .png",
        uuid: "kuulutuksetJaKutsu-uuid",
      },
    ],
    muuAineistoVelhosta: [
      {
        dokumenttiOid: "muuAineistoVelhostaDokumenttiOid",
        nimi: "muuAineistoVelhosta äöå .png",
        uuid: "muuAineistoVelhosta-uuid",
      },
    ],
    muuAineistoKoneelta: [
      {
        tiedosto: includeTiedosto ? "muuAineistoKoneelta/muuAineistoKoneelta_aoa_.png" : undefined,
        nimi: "muuAineistoKoneelta äöå .png",
        uuid: "muuAineistoKoneelta-uuid",
      },
    ],
    vastaanottajat: [{ sahkoposti: "vastaanottaja@sahkoposti.fi" }],
  };
}

export default TEST_HYVAKSYMISESITYS_INPUT;

export const INPUTIN_LADATUT_TIEDOSTOT: { nimi: string; uuid: string; filename: string }[] = [
  { nimi: "hyvaksymisEsitys äöå .png", uuid: "hyvaksymisEsitys", filename: "hyvaksymisEsitys_aoa_.png" },
  { nimi: "muistutukset äöå .png", uuid: "muistutukset", filename: "muistutukset_aoa_.png" },
  { nimi: "lausunnot äöå .png", uuid: "lausunnot", filename: "lausunnot_aoa_.png" },
  { nimi: "maanomistajaluettelo äöå .png", uuid: "maanomistajaluettelo", filename: "maanomistajaluettelo_aoa_.png" },
  { nimi: "kuulutuksetJaKutsu äöå .png", uuid: "kuulutuksetJaKutsu", filename: "kuulutuksetJaKutsu_aoa_.png" },
  { nimi: "muuAineistoKoneelta äöå .png", uuid: "muuAineistoKoneelta", filename: "muuAineistoKoneelta_aoa_.png" },
];
