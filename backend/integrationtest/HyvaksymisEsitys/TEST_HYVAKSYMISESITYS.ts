import { IHyvaksymisEsitys, JulkaistuHyvaksymisEsitys } from "../../src/database/model";
import { adaptFileName } from "../../src/tiedostot/paths";
import { DeepReadonly } from "hassu-common/specialTypes";

const TEST_HYVAKSYMISESITYS: DeepReadonly<IHyvaksymisEsitys> = getTestHyvaksymisEsitys();

function getTestHyvaksymisEsitys(number?: number): DeepReadonly<IHyvaksymisEsitys & Pick<JulkaistuHyvaksymisEsitys, "poistumisPaiva">> {
  const nbr = number || "";
  const lisatty = "2022-01-02T02:00:00+02:00";
  return {
    poistumisPaiva: "2033-01-01",
    versio: 1,
    hyvaksymisEsitys: [
      {
        nimi: `hyvaksymisEsitys äöå ${nbr}.png`,
        uuid: `hyvaksymis-esitys-uuid${nbr}`,
        lisatty,
      },
    ],
    suunnitelma: [
      {
        dokumenttiOid: `suunnitelmaDokumenttiOid${nbr}`,
        kategoriaId: "osa_b",
        nimi: `suunnitelma äöå ${nbr}.png`,
        uuid: `suunnitelma-uuid${nbr}`,
        lisatty,
      },
    ],
    kiireellinen: true,
    lisatiedot: `Lisätietoja${nbr}`,
    laskutustiedot: {
      ovtTunnus: `ovtTunnus${nbr}`,
      verkkolaskuoperaattorinTunnus: `verkkolaskuoperaattorinTunnus${nbr}`,
      viitetieto: `viitetieto${nbr}`,
    },
    muistutukset: [
      {
        nimi: `muistutukset äöå ${nbr}.png`,
        uuid: `muistutukset-uuid${nbr}`,
        lisatty,
        kunta: 91,
      },
    ],
    lausunnot: [
      {
        nimi: `lausunnot äöå ${nbr}.png`,
        uuid: `lausunnot-uuid${nbr}`,
        lisatty,
      },
    ],
    maanomistajaluettelo: [
      {
        nimi: `maanomistajaluettelo äöå ${nbr}.png`,
        uuid: `maanomistajaluettelo-uuid${nbr}`,
        lisatty,
      },
    ],
    kuulutuksetJaKutsu: [
      {
        nimi: `kuulutuksetJaKutsu äöå ${nbr}.png`,
        uuid: `kuulutuksetJaKutsu-uuid${nbr}`,
        lisatty,
      },
    ],
    muuAineistoVelhosta: [
      {
        dokumenttiOid: `muuAineistoVelhostaDokumenttiOid${nbr}`,
        nimi: `muuAineistoVelhosta äöå ${nbr}.png`,
        uuid: `muuAineistoVelhosta-uuid${nbr}`,
        lisatty,
      },
    ],
    muuAineistoKoneelta: [
      {
        nimi: `muuAineistoKoneelta äöå ${nbr}.png`,
        uuid: `muuAineistoKoneelta-uuid${nbr}`,
        lisatty,
      },
    ],
    vastaanottajat: [
      {
        sahkoposti: `vastaanottaja${nbr}@sahkoposti.fi`,
      },
    ],
    muokkaaja: `muokkaaja-oid${nbr}`,
  };
}

export default TEST_HYVAKSYMISESITYS;

export const TEST_HYVAKSYMISESITYS2: DeepReadonly<IHyvaksymisEsitys> = getTestHyvaksymisEsitys(2);

export const TEST_HYVAKSYMISESITYS_FILES: DeepReadonly<{ path: string; nimi: string }[]> = getHyvaksymisEsitysFiles();

export const TEST_HYVAKSYMISESITYS_FILES2: DeepReadonly<{ path: string; nimi: string }[]> = getHyvaksymisEsitysFiles(2);

function getHyvaksymisEsitysFiles(number?: number): DeepReadonly<{ path: string; nimi: string }[]> {
  const nbr = number || "";
  return [
    { path: `hyvaksymisEsitys/${adaptFileName(`hyvaksymisEsitys äöå ${nbr}.png`)}`, nimi: `hyvaksymisEsitys äöå ${nbr}.png` },
    { path: `suunnitelma/${adaptFileName(`suunnitelma äöå ${nbr}.png`)}`, nimi: `suunnitelma äöå ${nbr}.png` },
    { path: `muistutukset/${adaptFileName(`muistutukset äöå ${nbr}.png`)}`, nimi: `muistutukset äöå ${nbr}.png` },
    { path: `lausunnot/${adaptFileName(`lausunnot äöå ${nbr}.png`)}`, nimi: `lausunnot äöå ${nbr}.png` },
    { path: `maanomistajaluettelo/${adaptFileName(`maanomistajaluettelo äöå ${nbr}.png`)}`, nimi: `maanomistajaluettelo äöå ${nbr}.png` },
    { path: `kuulutuksetJaKutsu/${adaptFileName(`kuulutuksetJaKutsu äöå ${nbr}.png`)}`, nimi: `kuulutuksetJaKutsu äöå ${nbr}.png` },
    { path: `muuAineistoVelhosta/${adaptFileName(`muuAineistoVelhosta äöå ${nbr}.png`)}`, nimi: `muuAineistoVelhosta äöå ${nbr}.png` },
    { path: `muuAineistoKoneelta/${adaptFileName(`muuAineistoKoneelta äöå ${nbr}.png`)}`, nimi: `muuAineistoKoneelta äöå ${nbr}.png` },
  ];
}
