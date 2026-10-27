import { describe, it } from "mocha";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { projektiAdapter } from "../../src/projekti/adapter/projektiAdapter";
import * as sinon from "sinon";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { omistajaDatabase } from "../../src/database/omistajaDatabase";
import { mielipideDatabase } from "../../src/database/mielipideDatabase";
import { parameters } from "../../src/aws/parameters";
import * as API from "hassu-common/graphql/apiModel";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { expect } from "chai";

describe("projektiAdapter", () => {
  let fixture: ProjektiFixture;

  before(() => {
    mockClient(DynamoDBDocumentClient);
  });

  beforeEach(() => {
    fixture = new ProjektiFixture();
    const personSearchFixture = new PersonSearchFixture();
    sinon
      .stub(personSearch, "getKayttajas")
      .resolves(
        Kayttajas.fromKayttajaList([
          personSearchFixture.pekkaProjari,
          personSearchFixture.mattiMeikalainen,
          personSearchFixture.manuMuokkaaja,
        ])
      );
    sinon.stub(omistajaDatabase, "hasOmistajat").resolves(false);
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").resolves(false);
    sinon.stub(parameters, "isUspaIntegrationEnabled").resolves(false);
  });

  afterEach(() => {
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

  it("should set muistutusMaara for non-TOIMINNALLINEN projekti", async () => {
    const projekti = fixture.dbProjekti1();
    projekti.annetutMuistutukset = [{ id: "1" } as any, { id: "2" } as any];

    const result = await projektiAdapter.adaptProjekti(projekti);

    expect(result.muistutusMaara).to.equal(2);
    expect(result.mielipideMaara).to.be.undefined;
  });

  it("should not set muistutusMaara for TOIMINNALLINEN projekti", async () => {
    const projekti = fixture.dbProjekti1();
    projekti.velho!.tyyppi = API.ProjektiTyyppi.TOIMINNALLINEN;
    projekti.annetutMuistutukset = [{ id: "1" } as any];

    const result = await projektiAdapter.adaptProjekti(projekti);

    expect(result.muistutusMaara).to.be.undefined;
    expect(result.mielipideMaara).to.be.undefined;
  });

  it("should return mielipideMaara for TOIMINNALLINEN projekti in NAHTAVILLAOLO or greater status", async () => {
    const projekti = fixture.dbProjektiToiminnallinen();
    sinon.stub(mielipideDatabase, "haeMielipideMaara").resolves(7);

    const result = await projektiAdapter.adaptProjekti(projekti, undefined, true, { haeMielipideMaara: true });

    expect(result.mielipideMaara).to.equal(7);
    expect(result.muistutusMaara).to.be.undefined;
  });

  it("should not call haeMielipideMaara for TOIMINNALLINEN projekti before NAHTAVILLAOLO status", async () => {
    const projekti = {
      oid: "1.2.246.578.5.1.2978288874.2711575506",
      versio: 1,
      kayttoOikeudet: [],
      tallennettu: true,
      velho: { nimi: "Testi", tyyppi: API.ProjektiTyyppi.TOIMINNALLINEN },
    };
    const haeMielipideMaaraSpy = sinon.stub(mielipideDatabase, "haeMielipideMaara").resolves(7);

    const result = await projektiAdapter.adaptProjekti(projekti, undefined, true, { haeMielipideMaara: true });

    expect(result.mielipideMaara).to.be.undefined;
    expect(haeMielipideMaaraSpy.called).to.be.false;
  });
});
