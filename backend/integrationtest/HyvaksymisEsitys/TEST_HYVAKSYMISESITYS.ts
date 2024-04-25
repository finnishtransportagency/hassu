import { IHyvaksymisEsitys } from "../../src/database/model";
import { adaptFileName } from "../../src/tiedostot/paths";

const TEST_HYVAKSYMISESITYS: IHyvaksymisEsitys = getTestHyvaksymisEsitys();

function getTestHyvaksymisEsitys(number?: number) {
  const nbr = number || "";
  return {
    poistumisPaiva: "2033-01-01",
    versio: 1,
    hyvaksymisEsitys: [
      {
        nimi: `hyvaksymisEsitys äöå ${nbr}.png`,
        uuid: `hyvaksymis-esitys-uuid${nbr}`,
        lisatty: "2022-01-02T01:01:01:111",
      },
    ],
    suunnitelma: [
      {
        dokumenttiOid: `suunnitelmaDokumenttiOid${nbr}`,
        nimi: `suunnitelma äöå ${nbr}.png`,
        uuid: `suunnitelma-uuid${nbr}`,
        lisatty: "2022-01-02T01:01:01:111",
      },
    ],
    kiireellinen: true,
    lisatiedot: `Lisätietoja${nbr}`,
    laskutustiedot: {
      yTunnus: `yTunnus${nbr}`,
      ovtTunnus: `ovtTunnus${nbr}`,
      verkkolaskuoperaattorinTunnus: `verkkolaskuoperaattorinTunnus${nbr}`,
      viitetieto: `viitetieto${nbr}`,
    },
    muistutukset: [
      {
        nimi: `muistutukset äöå ${nbr}.png`,
        uuid: `muistutukset-esitys-uuid${nbr}`,
        lisatty: "2022-01-02T01:01:01:111",
        kunta: 1,
      },
    ],
    lausunnot: [
      {
        nimi: `lausunnot äöå ${nbr}.png`,
        uuid: `lausunnot-esitys-uuid${nbr}`,
        lisatty: "2022-01-02T01:01:01:111",
      },
    ],
    maanomistajaluettelo: [
      {
        nimi: `maanomistajaluettelo äöå ${nbr}.png`,
        uuid: `maanomistajaluettelo-esitys-uuid${nbr}`,
        lisatty: "2022-01-02T01:01:01:111",
      },
    ],
    kuulutuksetJaKutsu: [
      {
        nimi: `kuulutuksetJaKutsu äöå ${nbr}.png`,
        uuid: `kuulutuksetJaKutsu-esitys-uuid${nbr}`,
        lisatty: "2022-01-02T01:01:01:111",
      },
    ],
    muuAineistoVelhosta: [
      {
        dokumenttiOid: `muuAineistoVelhostaDokumenttiOid${nbr}`,
        nimi: `muuAineistoVelhosta äöå ${nbr}.png`,
        uuid: `muuAineistoVelhosta-uuid${nbr}`,
        lisatty: "2022-01-02",
      },
    ],
    muuAineistoKoneelta: [
      {
        nimi: `muuAineistoKoneelta äöå ${nbr}.png`,
        uuid: `muuAineistoKoneelta-esitys-uuid${nbr}`,
        lisatty: "2022-01-02T01:01:01:111",
      },
    ],
    vastaanottajat: [
      {
        sahkoposti: `vastaanottaja${nbr}@sahkoposti.fi`,
        messageId: `vastaanottajat-message-id${nbr}`,
        lahetetty: null,
        lahetysvirhe: null,
      },
    ],
    muokkaaja: `muokkaaja-oid${nbr}`,
  };
}

export default TEST_HYVAKSYMISESITYS;

export const TEST_HYVAKSYMISESITYS2 = getTestHyvaksymisEsitys(2);

export const TEST_HYVAKSYMISESITYS_FILE_PATHS = getHyvaksymisEsitysFilePaths();

export const TEST_HYVAKSYMISESITYS_FILE_PATHS2 = getHyvaksymisEsitysFilePaths(2);

function getHyvaksymisEsitysFilePaths(number?: number) {
  const nbr = number || "";
  return [
    `hyvaksymisEsitys/${adaptFileName(`hyvaksymisEsitys äöå ${nbr}.png`)}`,
    `suunnitelma/${adaptFileName(`suunnitelma äöå ${nbr}.png`)}`,
    `muistutukset/${adaptFileName(`muistutukset äöå ${nbr}.png`)}`,
    `lausunnot/${adaptFileName(`lausunnot äöå ${nbr}.png`)}`,
    `maanomistajaluettelo/${adaptFileName(`maanomistajaluettelo äöå ${nbr}.png`)}`,
    `kuulutuksetJaKutsu/${adaptFileName(`kuulutuksetJaKutsu äöå ${nbr}.png`)}`,
    `muuAineistoVelhosta/${adaptFileName(`muuAineistoVelhosta äöå ${nbr}.png`)}`,
    `muuAineistoKoneelta/${adaptFileName(`muuAineistoKoneelta äöå ${nbr}.png`)}`,
  ];
}
