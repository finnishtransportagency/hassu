import { DBProjekti, LadattuTiedosto, LausuntoPyynnonTaydennys, LausuntoPyynto } from "../../../../src/database/model";
import { adaptLausuntoPyynnonTaydennykset, adaptLausuntoPyynnot } from "../../../../src/projekti/adapter/adaptToAPI";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";

describe("adaptLausuntoPyynnot:", () => {
  it("adaptLausuntoPyynnot returns same hash for same lausuntoPyynto even if poistumisPaiva changes", () => {
    const dbProjekti: DBProjekti = {
      oid: "123",
      salt: "salt",
    } as any as DBProjekti; // adaptLausuntoPyynnot does not require anything else from dbProjekti
    const lausuntoPyynto: LausuntoPyynto = {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      lisaAineistot: [],
      aineistopaketti: "osoite/aineistopakettiin",
      muistiinpano: "Ei vielä lähetetty kellekään",
      poistetaan: false,
    };
    const adaptedLausuntoPyynto: API.LausuntoPyynto = adaptLausuntoPyynnot(dbProjekti, [lausuntoPyynto])?.pop() as API.LausuntoPyynto;
    const firstHash = adaptedLausuntoPyynto.hash;
    lausuntoPyynto.poistumisPaiva = "2022-02-02";
    const adaptedLausuntoPyyntoAfterPoistumisPaivaUpdate: API.LausuntoPyynto = adaptLausuntoPyynnot(dbProjekti, [
      lausuntoPyynto,
    ])?.pop() as API.LausuntoPyynto;
    const secondHash = adaptedLausuntoPyyntoAfterPoistumisPaivaUpdate.hash;
    expect(firstHash).to.eql(secondHash);
  });

  it("adaptLausuntoPyynnot adapts lisaAineistot by converting the relative tiedosto path in db to the long one including Projekti oid, and ordering Aineisto array by 'jarjetys' field", () => {
    const dbProjekti: DBProjekti = {
      oid: "123",
      salt: "salt",
    } as any as DBProjekti; // adaptLausuntoPyynnot does not require anything else from dbProjekti
    const lisaAineistot: LadattuTiedosto[] = [
      {
        tiedosto: "/lausuntopyynto/joku-uuid/Aineisto%201.txt",
        nimi: "Aineisto 1",
        tila: API.LadattuTiedostoTila.VALMIS,
        tuotu: "2021-12-01T01:01",
        jarjestys: 2,
      },
      {
        tiedosto: "/lausuntopyynto/joku-uuid/Aineisto%202.txt",
        nimi: "Aineisto 2",
        tila: API.LadattuTiedostoTila.VALMIS,
        tuotu: "2021-12-01T01:02",
        jarjestys: 1,
      },
    ];
    const lausuntoPyynto: LausuntoPyynto = {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      lisaAineistot,
      aineistopaketti: "osoite/aineistopakettiin",
      muistiinpano: "Ei vielä lähetetty kellekään",
      poistetaan: false,
    };
    const adaptedLausuntoPyynto: API.LausuntoPyynto = adaptLausuntoPyynnot(dbProjekti, [lausuntoPyynto])?.pop() as API.LausuntoPyynto;
    expect(adaptedLausuntoPyynto.lisaAineistot).to.eql([
      {
        __typename: "LadattuTiedosto",
        tiedosto: "/yllapito/tiedostot/projekti/123/lausuntopyynto/joku-uuid/Aineisto%202.txt",
        nimi: "Aineisto 2",
        tila: "VALMIS",
        tuotu: "2021-12-01T01:02",
        jarjestys: 1,
      },
      {
        __typename: "LadattuTiedosto",
        tiedosto: "/yllapito/tiedostot/projekti/123/lausuntopyynto/joku-uuid/Aineisto%201.txt",
        nimi: "Aineisto 1",
        tila: "VALMIS",
        tuotu: "2021-12-01T01:01",
        jarjestys: 2,
      },
    ]);
  });

  it("adaptLausuntoPyynnonTaydennys returns same hash for same lausuntoPyynnonTaydennys even if poistumisPaiva changes", () => {
    const dbProjekti: DBProjekti = {
      oid: "123",
      salt: "salt",
    } as any as DBProjekti; // adaptLausuntoPyynnot does not require anything else from dbProjekti
    const lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys = {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      muuAineisto: [],
      muistutukset: [],
      aineistopaketti: "osoite/aineistopakettiin",
      poistetaan: false,
      kunta: 1,
    };
    const adaptedLausuntoPyynto: API.LausuntoPyynnonTaydennys = adaptLausuntoPyynnonTaydennykset(dbProjekti, [
      lausuntoPyynnonTaydennys,
    ])?.pop() as API.LausuntoPyynnonTaydennys;
    const firstHash = adaptedLausuntoPyynto.hash;
    lausuntoPyynnonTaydennys.poistumisPaiva = "2022-02-02";
    const adaptedLausuntoPyynnonTaydennysAfterPoistumisPaivaUpdate: API.LausuntoPyynnonTaydennys = adaptLausuntoPyynnonTaydennykset(
      dbProjekti,
      [lausuntoPyynnonTaydennys]
    )?.pop() as API.LausuntoPyynnonTaydennys;
    const secondHash = adaptedLausuntoPyynnonTaydennysAfterPoistumisPaivaUpdate.hash;
    expect(firstHash).to.eql(secondHash);
  });

  it("adaptLausuntoPyynnonTaydennykset adapts muutAineistot and muistutukset by converting the relative tiedosto path in db to the long one including Projekti oid, and ordering Aineisto array and LadattuTiedosto array by 'jarjetys' field", () => {
    const dbProjekti: DBProjekti = {
      oid: "123",
      salt: "salt",
    } as any as DBProjekti; // adaptLausuntoPyynnot does not require anything else from dbProjekti
    const muuAineisto: LadattuTiedosto[] = [
      {
        tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/Aineisto%201.txt",
        nimi: "Aineisto 1",
        tila: API.LadattuTiedostoTila.VALMIS,
        tuotu: "2021-12-01T01:01",
        jarjestys: 2,
      },
      {
        tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/Aineisto%202.txt",
        nimi: "Aineisto 2",
        tila: API.LadattuTiedostoTila.VALMIS,
        tuotu: "2021-12-01T01:02",
        jarjestys: 1,
      },
    ];
    const muistutukset: LadattuTiedosto[] = [
      {
        tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/Tiedosto%201.txt",
        nimi: "Tiedosto 1",
        tila: API.LadattuTiedostoTila.VALMIS,
        tuotu: "2021-12-01T01:03",
        jarjestys: 2,
      },
      {
        tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/Tiedosto%202.txt",
        nimi: "Tiedosto 2",
        tila: API.LadattuTiedostoTila.VALMIS,
        tuotu: "2021-12-01T01:04",
        jarjestys: 1,
      },
    ];
    const lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys = {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      muuAineisto,
      muistutukset,
      aineistopaketti: "osoite/aineistopakettiin",
      poistetaan: false,
      kunta: 1,
    };
    const adaptedLausuntoPyynnonTaydennys: API.LausuntoPyynnonTaydennys = adaptLausuntoPyynnonTaydennykset(dbProjekti, [
      lausuntoPyynnonTaydennys,
    ])?.pop() as API.LausuntoPyynnonTaydennys;
    expect(adaptedLausuntoPyynnonTaydennys.muuAineisto).to.eql([
      {
        __typename: "LadattuTiedosto",
        tiedosto: "/yllapito/tiedostot/projekti/123/lausuntopyynnon_taydennys/joku-uuid/Aineisto%202.txt",
        nimi: "Aineisto 2",
        tila: "VALMIS",
        tuotu: "2021-12-01T01:02",
        jarjestys: 1,
      },
      {
        __typename: "LadattuTiedosto",
        tiedosto: "/yllapito/tiedostot/projekti/123/lausuntopyynnon_taydennys/joku-uuid/Aineisto%201.txt",
        nimi: "Aineisto 1",
        tila: "VALMIS",
        tuotu: "2021-12-01T01:01",
        jarjestys: 2,
      },
    ]);
    expect(adaptedLausuntoPyynnonTaydennys.muistutukset).to.eql([
      {
        __typename: "LadattuTiedosto",
        tiedosto: "/yllapito/tiedostot/projekti/123/lausuntopyynnon_taydennys/joku-uuid/Tiedosto%202.txt",
        nimi: "Tiedosto 2",
        tila: "VALMIS",
        tuotu: "2021-12-01T01:04",
        jarjestys: 1,
      },
      {
        __typename: "LadattuTiedosto",
        tiedosto: "/yllapito/tiedostot/projekti/123/lausuntopyynnon_taydennys/joku-uuid/Tiedosto%201.txt",
        nimi: "Tiedosto 1",
        tila: "VALMIS",
        tuotu: "2021-12-01T01:03",
        jarjestys: 2,
      },
    ]);
  });

  it("adaptLausuntoPyynnot adapt non-persisted files succesfully", () => {
    const dbProjekti: DBProjekti = {
      oid: "1.2.246.578.5.1.2978288874.2711575506",
      salt: "salt",
    } as any as DBProjekti; // adaptLausuntoPyynnot does not require anything else from dbProjekti
    const lausuntoPyynto: LausuntoPyynto = {
      aineistopaketti: "/lausuntopyynto/ee626b8b-e719-4d47-b161-06f7455614b4/aineisto.zip",
      muistiinpano: "ff",
      poistumisPaiva: "2023-11-16",
      uuid: "ee626b8b-e719-4d47-b161-06f7455614b4",
      lisaAineistot: [
        {
          nimi: "Screenshot 2023-09-29 at 17.59.03.png",
          jarjestys: 0,
          tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
          tiedosto: "/e6169b47-2035-40e5-9343-46fec03f7e95/Screenshot 2023-09-29 at 17.59.03.png",
        },
        {
          nimi: "Screenshot 2023-09-28 at 12.24.31.png",
          jarjestys: 1,
          tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
          tiedosto: "/e9ab1d6a-e8fd-4796-adea-d8e8e55e3481/Screenshot 2023-09-28 at 12.24.31.png",
        },
      ],
    };
    const adaptedLausuntoPyynto: API.LausuntoPyynto = adaptLausuntoPyynnot(dbProjekti, [lausuntoPyynto])?.pop() as API.LausuntoPyynto;
    expect(adaptedLausuntoPyynto.lisaAineistot).to.eql([
      {
        __typename: "LadattuTiedosto",
        tiedosto: "/e6169b47-2035-40e5-9343-46fec03f7e95/Screenshot 2023-09-29 at 17.59.03.png",
        nimi: "Screenshot 2023-09-29 at 17.59.03.png",
        tila: "ODOTTAA_PERSISTOINTIA",
        jarjestys: 0,
        tuotu: undefined,
      },
      {
        __typename: "LadattuTiedosto",
        tiedosto: "/e9ab1d6a-e8fd-4796-adea-d8e8e55e3481/Screenshot 2023-09-28 at 12.24.31.png",
        nimi: "Screenshot 2023-09-28 at 12.24.31.png",
        tila: "ODOTTAA_PERSISTOINTIA",
        jarjestys: 1,
        tuotu: undefined,
      },
    ]);
  });

  it("adaptLausuntoPyynnot does not return legacy lausuntoPyynnot", () => {
    const dbProjekti: DBProjekti = {
      oid: "1.2.246.578.5.1.2978288874.2711575506",
      salt: "salt",
    } as any as DBProjekti; // adaptLausuntoPyynnot does not require anything else from dbProjekti
    const lausuntoPyynto: LausuntoPyynto = {
      aineistopaketti: "/nahtavillaolo/1/aineisto.zip",
      legacy: 1,
      poistumisPaiva: "2023-11-16",
      uuid: "ee626b8b-e719-4d47-b161-06f7455614b4",
      lisaAineistot: [
        {
          tiedosto: "/nahtavillaolo/1/Aineisto%201.txt",
          nimi: "Aineisto 1",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "2021-12-01T01:01",
          jarjestys: 2,
        },
        {
          tiedosto: "/nahtavillaolo/1/joku-uuid/Aineisto%202.txt",
          nimi: "Aineisto 2",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "2021-12-01T01:02",
          jarjestys: 1,
        },
      ],
    };
    const adaptedLausuntoPyynnot: API.LausuntoPyynto[] = adaptLausuntoPyynnot(dbProjekti, [lausuntoPyynto]) as API.LausuntoPyynto[];
    expect(adaptedLausuntoPyynnot).to.eql([]);
  });
});
