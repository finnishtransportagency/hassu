import { describe, it } from "mocha";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { projektiAdapter } from "../../src/projekti/adapter/projektiAdapter";
import { IllegalArgumentError } from "../../src/error/IllegalArgumentError";
import * as sinon from "sinon";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { KuulutusJulkaisuTila } from "../../../common/graphql/apiModel";

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

  it("should prevent suunnittelusopimus from being removed if aloituskuulutus is published", async () => {
    const projekti = fixture.dbProjekti2();

    // Validate that there is an error if trying to publish suunnitteluvaihe before there is a published aloituskuulutusjulkaisu
    expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        suunnitteluSopimus: null,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow suunnittelusopimus being removed if aloituskuulutus is not published", async () => {
    const projekti = fixture.dbProjekti2();
    delete projekti.aloitusKuulutusJulkaisut;

    const result = await projektiAdapter.adaptProjektiToSave(projekti, {
      oid: projekti.oid,
      versio: projekti.versio,
      suunnitteluSopimus: null,
    });
    expect(result.projekti.suunnitteluSopimus).equals(null);
  });

  it("should precent suunnittelusopimus from being removed if latest aloituskuulutusjulkaisu is waiting for approval", async () => {
    const projekti = fixture.dbProjekti2();
    projekti.aloitusKuulutusJulkaisut?.push({
      ...projekti.aloitusKuulutusJulkaisut[projekti.aloitusKuulutusJulkaisut.length - 1],
      tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
    });

    // Validate that there is an error if trying to publish suunnitteluvaihe before there is a published aloituskuulutusjulkaisu
    expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        suunnitteluSopimus: null,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent suunnittelusopimus from being added if aloituskuulutus is published", async () => {
    const projekti = fixture.dbProjekti2();
    delete projekti.suunnitteluSopimus;
    // Validate that there is an error if trying to publish suunnitteluvaihe before there is a published aloituskuulutusjulkaisu
    expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        suunnitteluSopimus: {
          kunta: 1,
          logo: "123.jpg",
          yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
        },
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow suunnittelusopimus being added if aloituskuulutus is not published", async () => {
    const projekti = fixture.dbProjekti2();
    delete projekti.suunnitteluSopimus;
    delete projekti.aloitusKuulutusJulkaisut;

    const result = await projektiAdapter.adaptProjektiToSave(projekti, {
      oid: projekti.oid,
      versio: projekti.versio,
      suunnitteluSopimus: {
        kunta: 1,
        logo: "123.jpg",
        yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
      },
    });
    expect(result.projekti.suunnitteluSopimus).to.be.eql({
      kunta: 1,
      logo: "123.jpg",
      yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
    });
  });

  it("should precent suunnittelusopimus from being added if latest aloituskuulutusjulkaisu is waiting for approval", async () => {
    const projekti = fixture.dbProjekti2();
    delete projekti.suunnitteluSopimus;
    projekti.aloitusKuulutusJulkaisut?.push({
      ...projekti.aloitusKuulutusJulkaisut[projekti.aloitusKuulutusJulkaisut.length - 1],
      tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
    });

    // Validate that there is an error if trying to add suunnittelusopimus before there is a published aloituskuulutusjulkaisu
    expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        suunnitteluSopimus: {
          kunta: 1,
          logo: "123.jpg",
          yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
        },
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow nullifying arvioSeuraavanVaiheenAlkamisesta in vuorovaikutusKierros", async () => {
    const projekti = fixture.dbProjekti1();
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 0,
      arvioSeuraavanVaiheenAlkamisesta: "asdf",
    };

    const result = await projektiAdapter.adaptProjektiToSave(projekti, {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        arvioSeuraavanVaiheenAlkamisesta: "",
      },
    });
    expect(result.projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta).to.be.eql("");
  });
});
