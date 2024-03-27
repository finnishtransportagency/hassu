import { expect } from "chai";
import { DBProjekti } from "../../src/database/model";
import { adaptHyvaksymisEsitysToApi } from "../../src/projekti/adapter/adaptToAPI";
import * as API from "hassu-common/graphql/apiModel";

describe("adaptHyvaksymisEsitysToApi", () => {
  it("adaptoi tiedostopolut oikein", () => {
    const projektiInDB: Partial<DBProjekti> = {
      oid: "1",
      versio: 1,
      muokattavaHyvaksymisEsitys: {
        poistumisPaiva: "2033-01-01",
        hyvaksymisEsitys: [
          {
            tiedosto: "tiedosto.png",
            nimi: "tiedosto.png",
            uuid: "test",
            tuotu: "2022-01-01",
            tila: API.LadattuTiedostoTila.VALMIS,
          },
        ],
        suunnitelma: [
          {
            dokumenttiOid: "jotain",
            tiedosto: "aineisto.png",
            nimi: "aineisto.png",
            uuid: "test2",
            tuotu: "2022-01-02",
            tila: API.AineistoTila.VALMIS,
          },
        ],
      },
    };
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToApi(projektiInDB as DBProjekti, projektiInDB.muokattavaHyvaksymisEsitys, undefined);
    // Syystä tai toisesta ladatuille tiedostoille laitetaan adaptoinnissa täyden polun eteen kauttaviva, mutta aineistoille ei
    expect(hyvaksymisEsitys?.hyvaksymisEsitys?.[0].tiedosto).to.eql(
      "/yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys/tiedosto.png"
    );
    expect(hyvaksymisEsitys?.suunnitelma?.[0].tiedosto).to.eql("yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys/aineisto.png");
  });

  it("adaptoi muistutukset oikein, niin että kuntatieto säilyy", () => {
    const projektiInDB: Partial<DBProjekti> = {
      oid: "1",
      versio: 1,
      muokattavaHyvaksymisEsitys: {
        poistumisPaiva: "2033-01-01",
        muistutukset: [
          {
            tiedosto: "muistutus.png",
            nimi: "muistutus.png",
            uuid: "muistutus",
            tuotu: "2022-01-01",
            tila: API.LadattuTiedostoTila.VALMIS,
            kunta: 1,
          },
        ],
      },
    };
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToApi(projektiInDB as DBProjekti, projektiInDB.muokattavaHyvaksymisEsitys, undefined);
    // Syystä tai toisesta ladatuille tiedostoille laitetaan adaptoinnissa täyden polun eteen kauttaviva, mutta aineistoille ei
    expect(hyvaksymisEsitys?.muistutukset?.[0]?.kunta).to.eql(1);
  });

  it("näyttää muokattavan hyväksymisesityksen tiedot, jos on muokattava hyväksymisesitys, muttei julkaistua", () => {
    const projektiInDB: Partial<DBProjekti> = {
      oid: "1",
      versio: 1,
      muokattavaHyvaksymisEsitys: {
        poistumisPaiva: "2033-01-01",
      },
      julkaistuHyvaksymisEsitys: undefined,
    };
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToApi(
      projektiInDB as DBProjekti,
      projektiInDB.muokattavaHyvaksymisEsitys,
      projektiInDB.julkaistuHyvaksymisEsitys
    );
    expect(hyvaksymisEsitys?.poistumisPaiva).to.exist;
    expect(hyvaksymisEsitys?.tila).to.eql(API.HyvaksymisTila.MUOKKAUS);
  });

  it("näyttää muokattavan hyväksymisesityksen tiedot, jos on muokkaustilainen hyväksymisesitys ja julkaistu hyväksymisesitys", () => {
    const projektiInDB: Partial<DBProjekti> = {
      oid: "1",
      versio: 1,
      muokattavaHyvaksymisEsitys: {
        poistumisPaiva: "2033-01-02",
        tila: API.HyvaksymisTila.MUOKKAUS,
      },
      julkaistuHyvaksymisEsitys: {
        poistumisPaiva: "2033-01-01",
        hyvaksyja: "oid",
        hyvaksymisPaiva: "2033-01-03",
      },
    };
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToApi(
      projektiInDB as DBProjekti,
      projektiInDB.muokattavaHyvaksymisEsitys,
      projektiInDB.julkaistuHyvaksymisEsitys
    );
    expect(hyvaksymisEsitys?.poistumisPaiva).to.eql("2033-01-02");
    expect(hyvaksymisEsitys?.hyvaksyja).to.exist;
    expect(hyvaksymisEsitys?.hyvaksymisPaiva).to.exist;
    expect(hyvaksymisEsitys?.tila).to.eql(API.HyvaksymisTila.MUOKKAUS);
  });

  it("näyttää muokattavan hyväksymisesityksen tiedot, jos on hyväksyntää odottava hyväksymisesitys ja julkaistu hyväksymisesitys", () => {
    const projektiInDB: Partial<DBProjekti> = {
      oid: "1",
      versio: 1,
      muokattavaHyvaksymisEsitys: {
        poistumisPaiva: "2033-01-02",
        tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      },
      julkaistuHyvaksymisEsitys: {
        poistumisPaiva: "2033-01-01",
        hyvaksyja: "oid",
        hyvaksymisPaiva: "2033-01-03",
      },
    };
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToApi(
      projektiInDB as DBProjekti,
      projektiInDB.muokattavaHyvaksymisEsitys,
      projektiInDB.julkaistuHyvaksymisEsitys
    );
    expect(hyvaksymisEsitys?.poistumisPaiva).to.eql("2033-01-02");
    expect(hyvaksymisEsitys?.hyvaksyja).to.exist;
    expect(hyvaksymisEsitys?.hyvaksymisPaiva).to.exist;
    expect(hyvaksymisEsitys?.tila).to.eql(API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA);
  });

  it("näyttää hyväksytyn hyväksymisesityksen tiedot, jos on hyväksytty muokattava hyväksymisesitys ja julkaistu hyväksymisesitys", () => {
    const projektiInDB: Partial<DBProjekti> = {
      oid: "1",
      versio: 1,
      muokattavaHyvaksymisEsitys: {
        poistumisPaiva: "2033-01-01",
        tila: API.HyvaksymisTila.HYVAKSYTTY,
      },
      julkaistuHyvaksymisEsitys: {
        poistumisPaiva: "2033-01-01",
        hyvaksyja: "oid",
        hyvaksymisPaiva: "2033-01-03",
      },
    };
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToApi(
      projektiInDB as DBProjekti,
      projektiInDB.muokattavaHyvaksymisEsitys,
      projektiInDB.julkaistuHyvaksymisEsitys
    );
    expect(hyvaksymisEsitys?.poistumisPaiva).to.eql("2033-01-01");
    expect(hyvaksymisEsitys?.hyvaksyja).to.exist;
    expect(hyvaksymisEsitys?.hyvaksymisPaiva).to.exist;
    expect(hyvaksymisEsitys?.tila).to.eql(API.HyvaksymisTila.HYVAKSYTTY);
  });
});
