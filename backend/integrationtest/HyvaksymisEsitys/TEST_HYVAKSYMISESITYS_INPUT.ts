import * as API from "hassu-common/graphql/apiModel";

const TEST_HYVAKSYMISESITYS_INPUT: API.HyvaksymisEsitysInput = {
  poistumisPaiva: "2033-01-01",
  hyvaksymisEsitys: [
    {
      tiedosto: "hyvaksymisEsitys/hyvaksymisEsitys_aoa_.png",
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
    yTunnus: "yTunnus",
    ovtTunnus: "ovtTunnus",
    verkkolaskuoperaattorinTunnus: "verkkolaskuoperaattorinTunnus",
    viitetieto: "viitetieto",
  },
  muistutukset: [
    {
      tiedosto: "muistutukset/muistutukset_aoa_.png",
      nimi: "muistutukset äöå .png",
      uuid: "muistutukset-esitys-uuid",
    },
  ],
  lausunnot: [
    {
      tiedosto: "lausunnot/lausunnot_aoa_.png",
      nimi: "lausunnot äöå .png",
      uuid: "lausunnot-esitys-uuid",
    },
  ],
  maanomistajaluettelo: [
    {
      tiedosto: "maanomistajaluettelo/maanomistajaluettelo_aoa_.png",
      nimi: "maanomistajaluettelo äöå .png",
      uuid: "maanomistajaluettelo-esitys-uuid",
    },
  ],
  kuulutuksetJaKutsu: [
    {
      tiedosto: "kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_.png",
      nimi: "kuulutuksetJaKutsu äöå .png",
      uuid: "kuulutuksetJaKutsu-esitys-uuid",
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
      tiedosto: "muuAineistoKoneelta/muuAineistoKoneelta_aoa_.png",
      nimi: "muuAineistoKoneelta äöå .png",
      uuid: "muuAineistoKoneelta-esitys-uuid",
    },
  ],
  vastaanottajat: ["vastaanottaja@sahkoposti.fi"],
};

export default TEST_HYVAKSYMISESITYS_INPUT;

export const INPUTIN_LADATUT_TIEDOSTOT: { nimi: string; uuid: string; filename: string }[] = [
  { nimi: "hyvaksymisEsitys äöå .png", uuid: "hyvaksymisEsitys", filename: "hyvaksymisEsitys_aoa_.png" },
  { nimi: "muistutukset äöå .png", uuid: "muistutukset", filename: "muistutukset_aoa_.png" },
  { nimi: "lausunnot äöå .png", uuid: "lausunnot", filename: "lausunnot_aoa_.png" },
  { nimi: "maanomistajaluettelo äöå .png", uuid: "maanomistajaluettelo", filename: "maanomistajaluettelo_aoa_.png" },
  { nimi: "kuulutuksetJaKutsu äöå .png", uuid: "kuulutuksetJaKutsu", filename: "kuulutuksetJaKutsu_aoa_.png" },
  { nimi: "muuAineistoKoneelta äöå .png", uuid: "muuAineistoKoneelta", filename: "muuAineistoKoneelta_aoa_.png" },
];
