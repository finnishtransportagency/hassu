import { describe, it } from "mocha";
import * as sinon from "sinon";
import { expect } from "chai";
import { DBProjektiForSpecificVaiheFixture, VaiheenTila } from "../fixture/DBProjekti2ForSecificVaiheFixture";
import { Kieli, ProjektinJakotieto, Vaihe } from "hassu-common/graphql/apiModel";
import { GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { config } from "../../src/config";
import { haeLiittyvanProjektinTiedot } from "../../src/projekti/haeLiittyvanProjektinTiedot";
import { parameters } from "../../src/aws/parameters";
import { bankHolidaysClient } from "../../src/endDateCalculator/bankHolidaysClient";
import { BankHolidays } from "../../src/endDateCalculator/bankHolidays";
import { assertIsDefined } from "../../src/util/assertions";
import { JULKAISU_KEYS } from "../../src/database/model/julkaisuKey";
import { kirjaamoOsoitteetService } from "../../src/kirjaamoOsoitteet/kirjaamoOsoitteetService";

describe("haeLiittyvanProjektinTiedot", () => {
  const tableName = "Projekti-localstack";

  beforeEach(() => {
    sinon.stub(config, "projektiTableName").returns(tableName);
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(bankHolidaysClient, "getBankHolidays").returns(Promise.resolve(new BankHolidays([])));
    sinon.stub(kirjaamoOsoitteetService, "listKirjaamoOsoitteet").returns(Promise.resolve([]));
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should return julkinen false if aloituskuulutus is just a draft", async () => {
    const projekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.ALOITUSKUULUTUS, VaiheenTila.LUONNOS);
    assertIsDefined(projekti.kielitiedot);
    assertIsDefined(projekti.velho);
    const nimiSuomi = "Nimi suomeksi 123";
    const nimiRuotsi = "Nimi ruotsiksi 456";
    projekti.velho.nimi = nimiSuomi;
    projekti.kielitiedot.ensisijainenKieli = Kieli.SUOMI;
    projekti.kielitiedot.toissijainenKieli = Kieli.RUOTSI;
    projekti.kielitiedot.projektinNimiVieraskielella = nimiRuotsi;
    const mock = mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: tableName, Key: { oid: projekti.oid } })
      .resolves({
        Item: projekti,
      });
    const result = await haeLiittyvanProjektinTiedot(projekti.oid);
    const expectedResult: ProjektinJakotieto = {
      oid: projekti.oid,
      julkinen: false,
      nimi: { __typename: "LokalisoituTeksti", SUOMI: nimiSuomi, RUOTSI: nimiRuotsi },
      __typename: "ProjektinJakotieto",
    };
    expect(mock.commandCalls(GetCommand).length).to.equal(1);
    expect(result).to.eql(expectedResult);
  });

  it("should return julkinen false if every julkaisu is copied from another project", async () => {
    const projekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.NAHTAVILLAOLO, VaiheenTila.HYVAKSYTTY);
    JULKAISU_KEYS.forEach((key) => projekti[key]?.forEach((julkaisu) => (julkaisu.kopioituProjektista = "123")));
    assertIsDefined(projekti.kielitiedot);
    assertIsDefined(projekti.velho);
    const nimiSuomi = "Nimi suomeksi 123";
    const nimiRuotsi = "Nimi ruotsiksi 456";
    projekti.velho.nimi = nimiSuomi;
    projekti.kielitiedot.ensisijainenKieli = Kieli.SUOMI;
    projekti.kielitiedot.toissijainenKieli = Kieli.RUOTSI;
    projekti.kielitiedot.projektinNimiVieraskielella = nimiRuotsi;
    const mock = mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: tableName, Key: { oid: projekti.oid } })
      .resolves({
        Item: projekti,
      });
    const result = await haeLiittyvanProjektinTiedot(projekti.oid);
    const expectedResult: ProjektinJakotieto = {
      oid: projekti.oid,
      julkinen: false,
      nimi: { __typename: "LokalisoituTeksti", SUOMI: nimiSuomi, RUOTSI: nimiRuotsi },
      __typename: "ProjektinJakotieto",
    };
    expect(mock.commandCalls(GetCommand).length).to.equal(1);
    expect(result).to.eql(expectedResult);
  });

  it("should return julkinen true if aloituskuulutus hyväksytty and published", async () => {
    const projekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.ALOITUSKUULUTUS, VaiheenTila.HYVAKSYTTY);
    assertIsDefined(projekti.kielitiedot);
    assertIsDefined(projekti.velho);
    const nimiSuomi = "Nimi suomeksi 123";
    const nimiRuotsi = "Nimi ruotsiksi 456";
    projekti.velho.nimi = nimiSuomi;
    projekti.kielitiedot.ensisijainenKieli = Kieli.SUOMI;
    projekti.kielitiedot.toissijainenKieli = Kieli.RUOTSI;
    projekti.kielitiedot.projektinNimiVieraskielella = nimiRuotsi;
    const mock = mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: tableName, Key: { oid: projekti.oid } })
      .resolves({
        Item: projekti,
      });
    const result = await haeLiittyvanProjektinTiedot(projekti.oid);
    const expectedResult: ProjektinJakotieto = {
      oid: projekti.oid,
      julkinen: true,
      nimi: { __typename: "LokalisoituTeksti", SUOMI: nimiSuomi, RUOTSI: nimiRuotsi },
      __typename: "ProjektinJakotieto",
    };
    expect(mock.commandCalls(GetCommand).length).to.equal(1);
    expect(result).to.eql(expectedResult);
  });

  it("should return nimiRuotsi as undefined if languages are finnish and sami", async () => {
    const projekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.ALOITUSKUULUTUS, VaiheenTila.HYVAKSYTTY);
    assertIsDefined(projekti.kielitiedot);
    assertIsDefined(projekti.velho);
    const nimiSuomi = "Nimi suomeksi 123";
    projekti.velho.nimi = nimiSuomi;
    projekti.kielitiedot.ensisijainenKieli = Kieli.SUOMI;
    projekti.kielitiedot.toissijainenKieli = Kieli.POHJOISSAAME;
    projekti.kielitiedot.projektinNimiVieraskielella = "Nimi saameksi 456";

    const mock = mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: tableName, Key: { oid: projekti.oid } })
      .resolves({
        Item: projekti,
      });
    const result = await haeLiittyvanProjektinTiedot(projekti.oid);
    const expectedResult: ProjektinJakotieto = {
      oid: projekti.oid,
      julkinen: true,
      nimi: { __typename: "LokalisoituTeksti", SUOMI: nimiSuomi, RUOTSI: undefined },
      __typename: "ProjektinJakotieto",
    };
    expect(mock.commandCalls(GetCommand).length).to.equal(1);
    expect(result).to.eql(expectedResult);
  });
});
