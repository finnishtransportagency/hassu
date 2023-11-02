import { DBProjekti, LausuntoPyynto } from "../../../../src/database/model";
import { adaptLausuntoPyynnot } from "../../../../src/projekti/adapter/adaptToAPI";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";

describe("adaptLausuntoPyynnot", () => {
  it("returns same hash for same lausuntoPyynto even if poistumisPaiva changes", () => {
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
});
