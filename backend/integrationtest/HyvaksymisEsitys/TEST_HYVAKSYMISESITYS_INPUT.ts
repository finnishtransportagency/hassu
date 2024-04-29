import * as API from "hassu-common/graphql/apiModel";

const TEST_HYVAKSYMISESITYS_INPUT: API.HyvaksymisEsitysInput = {
  poistumisPaiva: "2033-01-01",
  hyvaksymisEsitys: [
    {
      tiedosto: "hyvaksymisEsitys.png",
      nimi: "hyvaksymisEsitys.png",
      uuid: "hyvaksymis-esitys-uuid",
    },
  ],
  suunnitelma: [
    {
      dokumenttiOid: "suunnitelmaDokumenttiOid",
      nimi: "suunnitelma.png",
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
      tiedosto: "muistutukset.png",
      nimi: "muistutukset.png",
      uuid: "muistutukset-esitys-uuid",
    },
  ],
  lausunnot: [
    {
      tiedosto: "lausunnot.png",
      nimi: "lausunnot.png",
      uuid: "lausunnot-esitys-uuid",
    },
  ],
  maanomistajaluettelo: [
    {
      tiedosto: "maanomistajaluettelo.png",
      nimi: "maanomistajaluettelo.png",
      uuid: "maanomistajaluettelo-esitys-uuid",
    },
  ],
  kuulutuksetJaKutsu: [
    {
      tiedosto: "kuulutuksetJaKutsu.png",
      nimi: "kuulutuksetJaKutsu.png",
      uuid: "kuulutuksetJaKutsu-esitys-uuid",
    },
  ],
  muuAineistoVelhosta: [
    {
      dokumenttiOid: "muuAineistoVelhostaDokumenttiOid",
      nimi: "muuAineistoVelhosta.png",
      uuid: "muuAineistoVelhosta-uuid",
    },
  ],
  muuAineistoKoneelta: [
    {
      tiedosto: "muuAineistoKoneelta.png",
      nimi: "muuAineistoKoneelta.png",
      uuid: "muuAineistoKoneelta-esitys-uuid",
    },
  ],
  vastaanottajat: ["vastaanottaja@sahkoposti.fi"],
};

export default TEST_HYVAKSYMISESITYS_INPUT;
