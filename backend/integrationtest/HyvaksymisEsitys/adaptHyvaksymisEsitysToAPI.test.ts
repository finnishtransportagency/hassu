import { expect } from "chai";
import { DBProjekti } from "../../src/database/model";
import { adaptHyvaksymisEsitysToAPI } from "../../src/projekti/adapter/adaptToAPI";
import * as API from "hassu-common/graphql/apiModel";
import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";

describe("adaptHyvaksymisEsitysToApi", () => {
  it("adaptoi tiedostopolut oikein", () => {
    const projektiInDB: Pick<
      DBProjekti,
      "oid" | "salt" | "muokattavaHyvaksymisEsitys" | "julkaistuHyvaksymisEsitys" | "aineistoHandledAt"
    > = {
      oid: "1",
      muokattavaHyvaksymisEsitys: {
        versio: 1,
        poistumisPaiva: "2033-01-01",
        hyvaksymisEsitys: [
          {
            nimi: "tiedosto.png",
            uuid: "test",
            lisatty: "2022-01-02T01:01:01:111",
          },
        ],
        suunnitelma: [
          {
            dokumenttiOid: "jotain",
            nimi: "aineisto.png",
            uuid: "test2",
            lisatty: "2022-01-02T01:01:01:111",
          },
        ],
      },
      salt: "jotain",
      aineistoHandledAt: "2022-01-02T01:01:01:222",
    };
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(projektiInDB);
    expect(hyvaksymisEsitys?.hyvaksymisEsitys?.[0].tiedosto).to.eql(
      "yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys/hyvaksymisEsitys/tiedosto.png"
    );
    expect(hyvaksymisEsitys?.suunnitelma?.[0].tiedosto).to.eql(
      "yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys/suunnitelma/aineisto.png"
    );
  });

  it("adaptoi muistutukset oikein, niin että kuntatieto säilyy", () => {
    const projektiInDB: Pick<DBProjekti, "oid" | "salt" | "muokattavaHyvaksymisEsitys" | "julkaistuHyvaksymisEsitys"> = {
      oid: "1",
      salt: "jotain",
      muokattavaHyvaksymisEsitys: {
        versio: 1,
        poistumisPaiva: "2033-01-01",
        muistutukset: [
          {
            nimi: "muistutus.png",
            uuid: "muistutus",
            lisatty: "2022-01-02T01:01:01:111",
            kunta: 1,
          },
        ],
      },
    };
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(projektiInDB);
    expect(hyvaksymisEsitys?.muistutukset?.[0]?.kunta).to.eql(1);
  });

  it("näyttää muokattavan hyväksymisesityksen tiedot, jos on muokattava hyväksymisesitys, muttei julkaistua", () => {
    const projektiInDB: Pick<DBProjekti, "oid" | "salt" | "muokattavaHyvaksymisEsitys" | "julkaistuHyvaksymisEsitys"> = {
      oid: "1",
      salt: "jotain",
      muokattavaHyvaksymisEsitys: {
        versio: 1,
        poistumisPaiva: "2033-01-01",
      },
      julkaistuHyvaksymisEsitys: undefined,
    };
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(projektiInDB);
    expect(hyvaksymisEsitys?.poistumisPaiva).to.exist;
    expect(hyvaksymisEsitys?.tila).to.eql(API.HyvaksymisTila.MUOKKAUS);
  });

  it("näyttää muokattavan hyväksymisesityksen tiedot, jos on muokkaustilainen hyväksymisesitys ja julkaistu hyväksymisesitys", () => {
    const projektiInDB: Pick<DBProjekti, "oid" | "salt" | "muokattavaHyvaksymisEsitys" | "julkaistuHyvaksymisEsitys"> = {
      oid: "1",
      salt: "jotain",
      muokattavaHyvaksymisEsitys: {
        versio: 1,
        poistumisPaiva: "2033-01-02",
        tila: API.HyvaksymisTila.MUOKKAUS,
      },
      julkaistuHyvaksymisEsitys: {
        versio: 1,
        poistumisPaiva: "2033-01-01",
        hyvaksyja: "oid",
        hyvaksymisPaiva: "2033-01-03",
      },
    };
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(projektiInDB);
    expect(hyvaksymisEsitys?.poistumisPaiva).to.eql("2033-01-02");
    expect(hyvaksymisEsitys?.hyvaksyja).to.exist;
    expect(hyvaksymisEsitys?.hyvaksymisPaiva).to.exist;
    expect(hyvaksymisEsitys?.tila).to.eql(API.HyvaksymisTila.MUOKKAUS);
  });

  it("näyttää muokattavan hyväksymisesityksen tiedot, jos on hyväksyntää odottava hyväksymisesitys ja julkaistu hyväksymisesitys", () => {
    const projektiInDB: Pick<DBProjekti, "oid" | "salt" | "muokattavaHyvaksymisEsitys" | "julkaistuHyvaksymisEsitys"> = {
      oid: "1",
      salt: "jotain",
      muokattavaHyvaksymisEsitys: {
        versio: 1,
        poistumisPaiva: "2033-01-02",
        tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      },
      julkaistuHyvaksymisEsitys: {
        versio: 1,
        poistumisPaiva: "2033-01-01",
        hyvaksyja: "oid",
        hyvaksymisPaiva: "2033-01-03",
      },
    };
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(projektiInDB);
    expect(hyvaksymisEsitys?.poistumisPaiva).to.eql("2033-01-02");
    expect(hyvaksymisEsitys?.hyvaksyja).to.exist;
    expect(hyvaksymisEsitys?.hyvaksymisPaiva).to.exist;
    expect(hyvaksymisEsitys?.tila).to.eql(API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA);
  });

  it("näyttää hyväksytyn hyväksymisesityksen tiedot, jos on hyväksytty muokattava hyväksymisesitys ja julkaistu hyväksymisesitys", () => {
    const projektiInDB: Pick<DBProjekti, "oid" | "salt" | "muokattavaHyvaksymisEsitys" | "julkaistuHyvaksymisEsitys"> = {
      oid: "1",
      salt: "jotain",
      muokattavaHyvaksymisEsitys: {
        versio: 1,
        poistumisPaiva: "2033-01-01",
        tila: API.HyvaksymisTila.HYVAKSYTTY,
      },
      julkaistuHyvaksymisEsitys: {
        versio: 1,
        poistumisPaiva: "2033-01-01",
        hyvaksyja: "oid",
        hyvaksymisPaiva: "2033-01-03",
      },
    };
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(projektiInDB);
    expect(hyvaksymisEsitys?.poistumisPaiva).to.eql("2033-01-01");
    expect(hyvaksymisEsitys?.hyvaksyja).to.exist;
    expect(hyvaksymisEsitys?.hyvaksymisPaiva).to.exist;
    expect(hyvaksymisEsitys?.tila).to.eql(API.HyvaksymisTila.HYVAKSYTTY);
  });

  it("sisällyttää adaptoidessa kaikki tiedot adaptoinnin tulokseen", () => {
    const projektiInDB = {
      oid: "1",
      salt: "jotain",
      muokattavaHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        tila: API.HyvaksymisTila.MUOKKAUS,
        palautusSyy: "Huono",
      },
      julkaistuHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        hyvaksyja: "oid",
        hyvaksymisPaiva: "2033-01-03",
      },
      aineistoHandledAt: "2022-01-02T02:01:00+02:00",
      hyvEsAineistoPaketti: "hyvaksymisesitys/aineisto.zip",
    } as any as Pick<DBProjekti, "oid" | "salt" | "muokattavaHyvaksymisEsitys" | "julkaistuHyvaksymisEsitys">;
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(projektiInDB);
    expect(hyvaksymisEsitys).to.eql({
      __typename: "HyvaksymisEsitys",
      hyvaksyja: "oid",
      hyvaksymisPaiva: "2033-01-03",
      poistumisPaiva: "2033-01-01",
      kiireellinen: true,
      lisatiedot: "Lisätietoja",
      laskutustiedot: {
        __typename: "Laskutustiedot",
        ovtTunnus: "ovtTunnus",
        verkkolaskuoperaattorinTunnus: "verkkolaskuoperaattorinTunnus",
        viitetieto: "viitetieto",
      },
      hyvaksymisEsitys: [
        {
          __typename: "LadattuTiedostoNew",
          nimi: "hyvaksymisEsitys äöå .png",
          lisatty: "2022-01-02T02:00:00+02:00",
          uuid: "hyvaksymis-esitys-uuid",
          tiedosto: "yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys/hyvaksymisEsitys/hyvaksymisEsitys_aoa_.png",
        },
      ],
      suunnitelma: [
        {
          __typename: "AineistoNew",
          dokumenttiOid: "suunnitelmaDokumenttiOid",
          kategoriaId: "osa_b",
          nimi: "suunnitelma äöå .png",
          lisatty: "2022-01-02T02:00:00+02:00",
          uuid: "suunnitelma-uuid",
          tuotu: true,
          tiedosto: "yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys/suunnitelma/suunnitelma_aoa_.png",
        },
      ],
      muistutukset: [
        {
          __typename: "KunnallinenLadattuTiedosto",
          nimi: "muistutukset äöå .png",
          lisatty: "2022-01-02T02:00:00+02:00",
          uuid: "muistutukset-uuid",
          kunta: 91,
          tiedosto: "yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys/muistutukset/muistutukset äöå .png",
        },
      ],
      lausunnot: [
        {
          __typename: "LadattuTiedostoNew",
          nimi: "lausunnot äöå .png",
          lisatty: "2022-01-02T02:00:00+02:00",
          uuid: "lausunnot-uuid",
          tiedosto: "yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys/lausunnot/lausunnot_aoa_.png",
        },
      ],
      kuulutuksetJaKutsu: [
        {
          __typename: "LadattuTiedostoNew",
          nimi: "kuulutuksetJaKutsu äöå .png",
          lisatty: "2022-01-02T02:00:00+02:00",
          uuid: "kuulutuksetJaKutsu-uuid",
          tiedosto: "yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys/kuulutuksenJaKutsu/kuulutuksetJaKutsu_aoa_.png",
        },
      ],
      muuAineistoVelhosta: [
        {
          __typename: "AineistoNew",
          dokumenttiOid: "muuAineistoVelhostaDokumenttiOid",
          kategoriaId: undefined,
          nimi: "muuAineistoVelhosta äöå .png",
          lisatty: "2022-01-02T02:00:00+02:00",
          uuid: "muuAineistoVelhosta-uuid",
          tuotu: true,
          tiedosto: "yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys/muuAineistoVelhosta/muuAineistoVelhosta_aoa_.png",
        },
      ],
      muuAineistoKoneelta: [
        {
          __typename: "LadattuTiedostoNew",
          nimi: "muuAineistoKoneelta äöå .png",
          lisatty: "2022-01-02T02:00:00+02:00",
          uuid: "muuAineistoKoneelta-uuid",
          tiedosto: "yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys/muuAineistoKoneelta/muuAineistoKoneelta_aoa_.png",
        },
      ],
      maanomistajaluettelo: [
        {
          __typename: "LadattuTiedostoNew",
          nimi: "maanomistajaluettelo äöå .png",
          lisatty: "2022-01-02T02:00:00+02:00",
          uuid: "maanomistajaluettelo-uuid",
          tiedosto: "yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys/maanomistajaluettelo/maanomistajaluettelo_aoa_.png",
        },
      ],
      vastaanottajat: [
        {
          __typename: "SahkopostiVastaanottaja",
          sahkoposti: "vastaanottaja@sahkoposti.fi",
        },
      ],
      tila: "MUOKKAUS",
      palautusSyy: "Huono",
      hash: "f67cde5bf0977767e610740d0196732784a101160024d848d8c0a894d267d2c276c08b06e5076972480e98cf12a431676b36bf30b7a221415f91f14a9e1186a8",
      aineistopaketti: "hyvaksymisesitys/aineisto.zip",
    });
  });

  it("antaa oikeat tuontitiedot, jos aineistoja ei ole koskaan tuotu", () => {
    const projektiInDB = {
      oid: "1",
      salt: "jotain",
      muokattavaHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        tila: API.HyvaksymisTila.MUOKKAUS,
      },
      julkaistuHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        hyvaksyja: "oid",
        hyvaksymisPaiva: "2033-01-03",
      },
      // aineistoHandledAt ei määritelty
    } as any as Pick<DBProjekti, "oid" | "salt" | "muokattavaHyvaksymisEsitys" | "julkaistuHyvaksymisEsitys">;
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(projektiInDB);
    expect(hyvaksymisEsitys?.muuAineistoVelhosta?.[0]?.tuotu).to.eql(false);
  });
});
