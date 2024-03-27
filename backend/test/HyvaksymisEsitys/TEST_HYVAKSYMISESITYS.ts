import { IHyvaksymisEsitys } from "../../src/database/model";
import * as API from "hassu-common/graphql/apiModel";

const TEST_HYVAKSYMISESITYS: IHyvaksymisEsitys = {
  poistumisPaiva: "2033-01-01",
  hyvaksymisEsitys: [
    {
      tiedosto: "hyvaksymiEsitys.png",
      nimi: "hyvaksymiEsitys.png",
      uuid: "hyvaksymis-esitys-uuid",
      tuotu: "2022-01-01",
      tila: API.LadattuTiedostoTila.VALMIS,
    },
  ],
  suunnitelma: [
    {
      dokumenttiOid: "suunnitelmaDokumenttiOid",
      tiedosto: "suunnitelma.png",
      nimi: "suunnitelma.png",
      uuid: "suunnitelma-uuid",
      tuotu: "2022-01-02",
      tila: API.AineistoTila.VALMIS,
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
      tuotu: "2022-01-01",
      tila: API.LadattuTiedostoTila.VALMIS,
    },
  ],
  lausunnot: [
    {
      tiedosto: "lausunnot.png",
      nimi: "lausunnot.png",
      uuid: "lausunnot-esitys-uuid",
      tuotu: "2022-01-01",
      tila: API.LadattuTiedostoTila.VALMIS,
    },
  ],
  maanomistajaluettelo: [
    {
      tiedosto: "maanomistajaluettelo.png",
      nimi: "maanomistajaluettelo.png",
      uuid: "maanomistajaluettelo-esitys-uuid",
      tuotu: "2022-01-01",
      tila: API.LadattuTiedostoTila.VALMIS,
    },
  ],
  kuulutuksetJaKutsu: [
    {
      tiedosto: "kuulutuksetJaKutsu.png",
      nimi: "kuulutuksetJaKutsu.png",
      uuid: "kuulutuksetJaKutsu-esitys-uuid",
      tuotu: "2022-01-01",
      tila: API.LadattuTiedostoTila.VALMIS,
    },
  ],
  muuAineistoVelhosta: [
    {
      dokumenttiOid: "muuAineistoVelhostaDokumenttiOid",
      tiedosto: "muuAineistoVelhosta.png",
      nimi: "muuAineistoVelhosta.png",
      uuid: "muuAineistoVelhosta-uuid",
      tuotu: "2022-01-02",
      tila: API.AineistoTila.VALMIS,
    },
  ],
  muuAineistoKoneelta: [
    {
      tiedosto: "muuAineistoKoneelta.png",
      nimi: "muuAineistoKoneelta.png",
      uuid: "muuAineistoKoneelta-esitys-uuid",
      tuotu: "2022-01-01",
      tila: API.LadattuTiedostoTila.VALMIS,
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
