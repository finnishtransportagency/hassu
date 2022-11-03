import { describe, it } from "mocha";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { projektiAdapter } from "../../src/projekti/adapter/projektiAdapter";
import { findPublishedAloitusKuulutusJulkaisu } from "../../src/projekti/adapter/common";

import { IllegalArgumentError } from "../../src/error/IllegalArgumentError";
import * as sinon from "sinon";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { SuunnitteluVaiheTila } from "../../../common/graphql/apiModel";

const { expect } = require("chai");

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

  it("should prevent suunnitteluvaihe publishing without valid aloituskuulutusjulkaisu", async () => {
    const projekti = fixture.dbProjekti2();

    projekti.aloitusKuulutusJulkaisut = undefined;
    projekti.suunnitteluVaihe = undefined;

    // Validate that there is an error if trying to publish suunnitteluvaihe before there is a published aloituskuulutusjulkaisu
    expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        suunnitteluVaihe: { hankkeenKuvaus: fixture.hankkeenKuvausSuunnitteluVaiheessa, tila: SuunnitteluVaiheTila.JULKINEN },
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow suunnitteluvaihe publishing with a valid aloituskuulutusjulkaisu", async () => {
    const projekti = fixture.dbProjekti2();

    expect(findPublishedAloitusKuulutusJulkaisu(projekti.aloitusKuulutusJulkaisut!)).to.not.be.empty;
    expect(projekti.suunnitteluVaihe).to.be.undefined;

    const result = await projektiAdapter.adaptProjektiToSave(projekti, {
      oid: projekti.oid,
      suunnitteluVaihe: { hankkeenKuvaus: fixture.hankkeenKuvausSuunnitteluVaiheessa, tila: SuunnitteluVaiheTila.JULKINEN },
    });
    expect(result.projekti.suunnitteluVaihe?.tila).eq(SuunnitteluVaiheTila.JULKINEN);
  });

  it("should prevent saving vuorovaikutus without saved suunnitteluvaihe", async () => {
    const projekti = fixture.dbProjekti2();
    projekti.suunnitteluVaihe = undefined;

    // Validate that there is an error if trying to publish suunnitteluvaihe before there is a published aloituskuulutusjulkaisu
    expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        suunnitteluVaihe: {
          hankkeenKuvaus: fixture.hankkeenKuvausSuunnitteluVaiheessa,
          vuorovaikutus: fixture.vuorovaikutus,
        },
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow saving vuorovaikutus with saved suunnitteluvaihe", async () => {
    const projekti = fixture.dbProjekti2();
    projekti.suunnitteluVaihe = { hankkeenKuvaus: fixture.hankkeenKuvausSuunnitteluVaiheessa };

    const result = await projektiAdapter.adaptProjektiToSave(projekti, {
      oid: projekti.oid,
      suunnitteluVaihe: {
        hankkeenKuvaus: fixture.hankkeenKuvausSuunnitteluVaiheessa,
        vuorovaikutus: fixture.vuorovaikutus,
      },
    });
    expect(result.projekti.suunnitteluVaihe).not.to.be.undefined;
  });
});
