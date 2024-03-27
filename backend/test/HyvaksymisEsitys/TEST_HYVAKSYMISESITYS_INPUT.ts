import * as API from "hassu-common/graphql/apiModel";

const TEST_HYVAKSYMISESITYS_INPUT: API.HyvaksymisEsitysInput = {
  poistumisPaiva: "2033-01-01",
  hyvaksymisEsitys: [
    {
      tiedosto: "hyvaksymiEsitys.png",
      nimi: "hyvaksymiEsitys.png",
      uuid: "hyvaksymis-esitys-uuid",
      tila: API.LadattuTiedostoTila.VALMIS,
    },
  ],
  suunnitelma: [
    {
      dokumenttiOid: "suunnitelmaDokumenttiOid",
      nimi: "suunnitelma.png",
      uuid: "suunnitelma-uuid",
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
      tila: API.LadattuTiedostoTila.VALMIS,
    },
  ],
  lausunnot: [
    {
      tiedosto: "lausunnot.png",
      nimi: "lausunnot.png",
      uuid: "lausunnot-esitys-uuid",
      tila: API.LadattuTiedostoTila.VALMIS,
    },
  ],
  maanomistajaluettelo: [
    {
      tiedosto: "maanomistajaluettelo.png",
      nimi: "maanomistajaluettelo.png",
      uuid: "maanomistajaluettelo-esitys-uuid",
      tila: API.LadattuTiedostoTila.VALMIS,
    },
  ],
  kuulutuksetJaKutsu: [
    {
      tiedosto: "kuulutuksetJaKutsu.png",
      nimi: "kuulutuksetJaKutsu.png",
      uuid: "kuulutuksetJaKutsu-esitys-uuid",
      tila: API.LadattuTiedostoTila.VALMIS,
    },
  ],
  muuAineistoVelhosta: [
    {
      dokumenttiOid: "muuAineistoVelhostaDokumenttiOid",
      nimi: "muuAineistoVelhosta.png",
      uuid: "muuAineistoVelhosta-uuid",
      tila: API.AineistoTila.VALMIS,
    },
  ],
  muuAineistoKoneelta: [
    {
      tiedosto: "muuAineistoKoneelta.png",
      nimi: "muuAineistoKoneelta.png",
      uuid: "muuAineistoKoneelta-esitys-uuid",
      tila: API.LadattuTiedostoTila.VALMIS,
    },
  ],
  vastaanottajat: ["vastaanottaja@sahkoposti.fi"],
};

export default TEST_HYVAKSYMISESITYS_INPUT;
