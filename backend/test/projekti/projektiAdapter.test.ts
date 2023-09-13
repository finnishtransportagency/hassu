import { describe, it } from "mocha";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { projektiAdapter } from "../../src/projekti/adapter/projektiAdapter";
import * as sinon from "sinon";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";

import { expect } from "chai";

describe("projektiAdapter", () => {
  let fixture: ProjektiFixture;

  let getKayttajasStub: sinon.SinonStub;

  before(() => {
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
  });

  beforeEach(() => {
    fixture = new ProjektiFixture();
    const personSearchFixture = new PersonSearchFixture();
    getKayttajasStub.resolves(
      Kayttajas.fromKayttajaList([
        personSearchFixture.pekkaProjari,
        personSearchFixture.mattiMeikalainen,
        personSearchFixture.manuMuokkaaja,
      ])
    );
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("should allow nullifying arvioSeuraavanVaiheenAlkamisesta in vuorovaikutusKierros", async () => {
    const projekti = fixture.dbProjekti1();
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 0,
      arvioSeuraavanVaiheenAlkamisesta: {
        SUOMI: "asdf",
        RUOTSI: "RUOTSIKSI asdf",
      },
    };

    const result = await projektiAdapter.adaptProjektiToSave(projekti, {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        arvioSeuraavanVaiheenAlkamisesta: null,
      },
    });
    expect(result.projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta).to.be.eql(null);
  });
});
