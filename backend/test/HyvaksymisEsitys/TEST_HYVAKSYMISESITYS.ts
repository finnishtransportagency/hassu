import { IHyvaksymisEsitys } from "../../src/database/model";

const TEST_HYVAKSYMISESITYS: IHyvaksymisEsitys = {
  poistumisPaiva: "2033-01-01",
  hyvaksymisEsitys: [
    {
      nimi: "hyvaksymiEsitys.png",
      uuid: "hyvaksymis-esitys-uuid",
      lisatty: "2022-01-02T01:01:01:111",
    },
  ],
  suunnitelma: [
    {
      dokumenttiOid: "suunnitelmaDokumenttiOid",
      nimi: "suunnitelma.png",
      uuid: "suunnitelma-uuid",
      lisatty: "2022-01-02T01:01:01:111",
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
      nimi: "muistutukset.png",
      uuid: "muistutukset-esitys-uuid",
      lisatty: "2022-01-02T01:01:01:111",
      kunta: 1,
    },
  ],
  lausunnot: [
    {
      nimi: "lausunnot.png",
      uuid: "lausunnot-esitys-uuid",
      lisatty: "2022-01-02T01:01:01:111",
    },
  ],
  maanomistajaluettelo: [
    {
      nimi: "maanomistajaluettelo.png",
      uuid: "maanomistajaluettelo-esitys-uuid",
      lisatty: "2022-01-02T01:01:01:111",
    },
  ],
  kuulutuksetJaKutsu: [
    {
      nimi: "kuulutuksetJaKutsu.png",
      uuid: "kuulutuksetJaKutsu-esitys-uuid",
      lisatty: "2022-01-02T01:01:01:111",
    },
  ],
  muuAineistoVelhosta: [
    {
      dokumenttiOid: "muuAineistoVelhostaDokumenttiOid",
      nimi: "muuAineistoVelhosta.png",
      uuid: "muuAineistoVelhosta-uuid",
      lisatty: "2022-01-02",
    },
  ],
  muuAineistoKoneelta: [
    {
      nimi: "muuAineistoKoneelta.png",
      uuid: "muuAineistoKoneelta-esitys-uuid",
      lisatty: "2022-01-02T01:01:01:111",
    },
  ],
  vastaanottajat: [
    {
      sahkoposti: "vastaanottaja@sahkoposti.fi",
      messageId: "vastaanottajat-message-id",
      lahetetty: null,
      lahetysvirhe: null,
    },
  ],
  muokkaaja: "muokkaaja-oid",
};

export default TEST_HYVAKSYMISESITYS;
