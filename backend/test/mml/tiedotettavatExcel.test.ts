import { ProjektiTyyppi, TiedotettavanLahetyksenTila, Vaihe } from "hassu-common/graphql/apiModel";
import { DBProjekti, DBVaylaUser } from "../../src/database/model";
import { generateExcel, generateExcelByQuery, tallennaMaanomistajaluettelo } from "../../src/mml/tiedotettavatExcel";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DBOmistaja } from "../../src/database/omistajaDatabase";
import readXlsxFile from "read-excel-file/node";
import { expect } from "chai";
import { identifyMockUser } from "../../src/user/userService";
import { getKiinteistonomistajaTableName, getMuistuttajaTableName } from "../../src/util/environment";
import fs from "fs";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { fileService } from "../../src/files/fileService";
import sinon from "sinon";
import MockDate from "mockdate";
import { DBMuistuttaja } from "../../src/database/muistuttajaDatabase";

const projekti: Partial<DBProjekti> = {
  oid: "1.2.3",
  kayttoOikeudet: [{ kayttajatunnus: "testuid" } as unknown as DBVaylaUser],
  velho: {
    nimi: "Testiprojekti 1",
    tyyppi: ProjektiTyyppi.TIE,
  },
};
const rataProjekti: Partial<DBProjekti> = {
  oid: "1.2.3",
  kayttoOikeudet: [{ kayttajatunnus: "testuid" } as unknown as DBVaylaUser],
  velho: {
    nimi: "Testiprojekti 1",
    tyyppi: ProjektiTyyppi.RATA,
  },
};
const yleisProjekti: Partial<DBProjekti> = {
  oid: "1.2.3",
  kayttoOikeudet: [{ kayttajatunnus: "testuid" } as unknown as DBVaylaUser],
  velho: {
    nimi: "Testiprojekti 1",
    tyyppi: ProjektiTyyppi.YLEINEN,
  },
};
const omistaja1: DBOmistaja = {
  id: "1",
  kaytossa: true,
  kiinteistotunnus: "12345600010291",
  lisatty: "2024-02-21 10:01:12+02:00",
  oid: projekti.oid!,
  etunimet: "Etunimi",
  sukunimi: "Sukunimi",
  jakeluosoite: "Osoite 1",
  postinumero: "00100",
  paikkakunta: "Helsinki",
  maakoodi: "FI",
  suomifiLahetys: true,
  lahetykset: [
    { tila: TiedotettavanLahetyksenTila.VIRHE, lahetysaika: "2024-11-04 09:09:00+02:00" },
    { tila: TiedotettavanLahetyksenTila.OK, lahetysaika: "2024-11-04 10:00:00+02:00" },
  ],
};
const omistaja2: DBOmistaja = {
  id: "2",
  kaytossa: true,
  kiinteistotunnus: "12345600010291",
  lisatty: "2024-02-21 10:01:12+02:00",
  oid: projekti.oid!,
  etunimet: "Etunimi2",
  sukunimi: "Sukunimi2",
  jakeluosoite: "Osoite 2",
  postinumero: "01600",
  paikkakunta: "Vantaa",
  maakoodi: "FI",
  suomifiLahetys: true,
  lahetykset: [{ tila: TiedotettavanLahetyksenTila.VIRHE, lahetysaika: "2024-11-04 09:09:00+02:00" }],
};
const omistaja3: DBOmistaja = {
  id: "3",
  kaytossa: true,
  kiinteistotunnus: "12345600010291",
  lisatty: "2024-02-21 10:01:12+02:00",
  oid: projekti.oid!,
  etunimet: "Etunimi3",
  sukunimi: "Sukunimi3",
  jakeluosoite: "Osoite 3",
  postinumero: "02600",
  paikkakunta: "Espoo",
  maakoodi: "FI",
  suomifiLahetys: false,
};
const omistaja4: DBOmistaja = {
  id: "4",
  kaytossa: true,
  kiinteistotunnus: "12345600010291",
  lisatty: "2024-02-21 10:01:12+02:00",
  oid: projekti.oid!,
  nimi: "Yritys Oy Ab",
  jakeluosoite: "Osoite 4",
  postinumero: "96101",
  paikkakunta: "Rovaniemi",
  maakoodi: "FI",
  suomifiLahetys: false,
};
const omistaja5: DBOmistaja = {
  id: "5",
  kaytossa: true,
  kiinteistotunnus: "04105600010000",
  lisatty: "2024-02-21 10:01:12+02:00",
  paivitetty: "2024-02-22 08:43:12+02:00",
  oid: projekti.oid!,
  suomifiLahetys: false,
};
const muistuttaja1: DBMuistuttaja = {
  id: "1",
  expires: 0,
  lisatty: "2024-02-21 10:01:12+02:00",
  oid: projekti.oid!,
  etunimi: "Tytti",
  sukunimi: "Testaaja",
  henkilotunnus: "111111-112A",
  lahiosoite: "Osoite 456",
  postinumero: "02600",
  postitoimipaikka: "Espoo",
  maakoodi: "FI",
  suomifiLahetys: true,
  lahetykset: [
    { tila: TiedotettavanLahetyksenTila.VIRHE, lahetysaika: "2024-11-04 09:00:00+02:00" },
    { tila: TiedotettavanLahetyksenTila.OK, lahetysaika: "2024-11-04 11:00:00+02:00" },
  ],
};
const muistuttaja2: DBMuistuttaja = {
  id: "2",
  expires: 0,
  lisatty: "2024-02-21 10:01:12+02:00",
  oid: projekti.oid!,
  etunimi: "Matti",
  sukunimi: "Testaaja",
  henkilotunnus: "111111-111A",
  lahiosoite: "Osoite 123",
  postinumero: "01600",
  postitoimipaikka: "Vantaa",
  maakoodi: "FI",
  suomifiLahetys: true,
  lahetykset: [
    { tila: TiedotettavanLahetyksenTila.VIRHE, lahetysaika: "2024-11-04 11:00:01+02:00" },
    { tila: TiedotettavanLahetyksenTila.OK, lahetysaika: "2024-11-04 11:00:00+02:00" },
  ],
};
const muistuttaja3: DBMuistuttaja = {
  id: "3",
  expires: 0,
  lisatty: "2024-02-21 10:01:12+02:00",
  oid: projekti.oid!,
  etunimi: "Teppo",
  sukunimi: "Muistuttaja",
  henkilotunnus: "",
  lahiosoite: "Muistuttajan osoite",
  postinumero: "00100",
  postitoimipaikka: "Helsinki",
  maakoodi: "FI",
  tiedotustapa: "Eikös se sähköpostilla",
};
describe("tiedotettavatExcel", () => {
  before(() => {
    MockDate.set("2024-02-27");
    identifyMockUser({ roolit: ["hassu_admin"], etunimi: "Test", sukunimi: "Test", uid: "testuid", __typename: "NykyinenKayttaja" });
    mockClient(DynamoDBDocumentClient)
      .on(QueryCommand, { TableName: getKiinteistonomistajaTableName() })
      .resolves({ Items: [omistaja1, omistaja2, omistaja3, omistaja4, omistaja5] })
      .on(QueryCommand, { TableName: getMuistuttajaTableName() })
      .resolves({ Items: [muistuttaja1, muistuttaja2, muistuttaja3] })
      .on(GetCommand)
      .resolves({ Item: projekti });
  });
  after(() => {
    MockDate.reset();
  });
  it("tallenna kiinteistön omistajat excel tiedostoon nähtävilläolo", async () => {
    const buffer = await generateExcel(projekti as DBProjekti, true, Vaihe.NAHTAVILLAOLO, "2024-02-21");
    fs.writeFileSync(__dirname + "/maanomistajaluettelo_nahtavillaolo.xlsx", buffer);
    let rows = await readXlsxFile(buffer, { sheet: "Suomi.fi kiinteistönomistajat" });
    expect(rows).toMatchSnapshot();
    rows = await readXlsxFile(buffer, { sheet: "Muut kiinteistönomistajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna kiinteistön omistajat excel tiedostoon hyväksymispäätös", async () => {
    const buffer = await generateExcel(projekti as DBProjekti, true, Vaihe.HYVAKSYMISPAATOS, "2024-02-21");
    fs.writeFileSync(__dirname + "/maanomistajaluettelo_hyvaksymispaatos.xlsx", buffer);
    let rows = await readXlsxFile(buffer, { sheet: "Suomi.fi kiinteistönomistajat" });
    expect(rows).toMatchSnapshot();
    rows = await readXlsxFile(buffer, { sheet: "Muut kiinteistönomistajat" });
    expect(rows).toMatchSnapshot();
    rows = await readXlsxFile(buffer, { sheet: "Suomi.fi muistuttajat" });
    expect(rows).toMatchSnapshot();
    rows = await readXlsxFile(buffer, { sheet: "Muut muistuttajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna kiinteistön omistajat excel tiedostoon Suomi.fi", async () => {
    const buffer = await generateExcel(projekti as DBProjekti, true, undefined, undefined, true);
    const rows = await readXlsxFile(buffer, { sheet: "Suomi.fi kiinteistönomistajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna kiinteistön omistajat excel tiedostoon muut", async () => {
    const buffer = await generateExcel(projekti as DBProjekti, true, undefined, undefined, false);
    const rows = await readXlsxFile(buffer, { sheet: "Muut kiinteistönomistajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna kiinteistön omistajat excel tiedostoon graphql Suomi.fi", async () => {
    const excel = await generateExcelByQuery({ kiinteisto: true, oid: "1.2.3", suomifi: true });
    expect(excel.nimi).to.be.equal("Maanomistajaluettelo (suomi.fi) 20240227.xlsx");
    const rows = await readXlsxFile(Buffer.from(excel.sisalto, "base64"), { sheet: "Suomi.fi kiinteistönomistajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna kiinteistön omistajat excel tiedostoon graphql muut", async () => {
    const excel = await generateExcelByQuery({ kiinteisto: true, oid: "1.2.3", suomifi: false });
    expect(excel.nimi).to.be.equal("Maanomistajaluettelo (muilla tavoin) 20240227.xlsx");
    const rows = await readXlsxFile(Buffer.from(excel.sisalto, "base64"), { sheet: "Muut kiinteistönomistajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna kiinteistön omistajat excel tiedostoon graphql kaikki", async () => {
    const excel = await generateExcelByQuery({ kiinteisto: true, oid: "1.2.3", suomifi: null });
    expect(excel.nimi).to.be.equal("Maanomistajaluettelo 20240227.xlsx");
    let rows = await readXlsxFile(Buffer.from(excel.sisalto, "base64"), { sheet: "Suomi.fi kiinteistönomistajat" });
    expect(rows).toMatchSnapshot();
    rows = await readXlsxFile(Buffer.from(excel.sisalto, "base64"), { sheet: "Muut kiinteistönomistajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna muistuttajat excel tiedostoon graphql Suomi.fi", async () => {
    const excel = await generateExcelByQuery({ kiinteisto: false, oid: "1.2.3", suomifi: true });
    expect(excel.nimi).to.be.equal("Muistuttajat (suomi.fi) 20240227.xlsx");
    const rows = await readXlsxFile(Buffer.from(excel.sisalto, "base64"), { sheet: "Suomi.fi muistuttajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna muistuttajat  excel tiedostoon graphql muut", async () => {
    const excel = await generateExcelByQuery({ kiinteisto: false, oid: "1.2.3", suomifi: false });
    expect(excel.nimi).to.be.equal("Muistuttajat (muilla tavoin) 20240227.xlsx");
    const rows = await readXlsxFile(Buffer.from(excel.sisalto, "base64"), { sheet: "Muut muistuttajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna muistuttajat excel tiedostoon graphql kaikki", async () => {
    const excel = await generateExcelByQuery({ kiinteisto: false, oid: "1.2.3", suomifi: null });
    expect(excel.nimi).to.be.equal("Muistuttajat 20240227.xlsx");
    let rows = await readXlsxFile(Buffer.from(excel.sisalto, "base64"), { sheet: "Suomi.fi muistuttajat" });
    expect(rows).toMatchSnapshot();
    rows = await readXlsxFile(Buffer.from(excel.sisalto, "base64"), { sheet: "Muut muistuttajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna maanomistajaluettelo excel nähtävilläolo tie", async () => {
    const file = sinon.stub(fileService, "createFileToProjekti");
    await tallennaMaanomistajaluettelo(projekti as DBProjekti, new ProjektiPaths(projekti.oid!), Vaihe.NAHTAVILLAOLO, "2024-02-28", 1);
    const createParams = file.getCall(0).args[0];
    expect(createParams.fileName).to.be.equal("T416 Maanomistajaluettelo 20240228.xlsx");
    file.restore();
  });
  it("tallenna maanomistajaluettelo excel nähtävilläolo yleis", async () => {
    const file = sinon.stub(fileService, "createFileToProjekti");
    await tallennaMaanomistajaluettelo(yleisProjekti as DBProjekti, new ProjektiPaths(projekti.oid!), Vaihe.NAHTAVILLAOLO, "2024-02-28", 1);
    const createParams = file.getCall(0).args[0];
    expect(createParams.fileName).to.be.equal("Y416 Maanomistajaluettelo 20240228.xlsx");
    file.restore();
  });
  it("tallenna maanomistajaluettelo excel nähtävilläolo yleis 2", async () => {
    const file = sinon.stub(fileService, "createFileToProjekti");
    await tallennaMaanomistajaluettelo(yleisProjekti as DBProjekti, new ProjektiPaths(projekti.oid!), Vaihe.NAHTAVILLAOLO, "2024-02-28", 2);
    const createParams = file.getCall(0).args[0];
    expect(createParams.fileName).to.be.equal("Y416 Maanomistajaluettelo 20240228 2.xlsx");
    file.restore();
  });
  it("tallenna maanomistajaluettelo excel hyväksymispäätös", async () => {
    const file = sinon.stub(fileService, "createFileToProjekti");
    await tallennaMaanomistajaluettelo(
      rataProjekti as DBProjekti,
      new ProjektiPaths(projekti.oid!),
      Vaihe.HYVAKSYMISPAATOS,
      "2024-02-28",
      1
    );
    const createParams = file.getCall(0).args[0];
    expect(createParams.fileName).to.be.equal("R417 Maanomistajaluettelo ja muistuttajat 20240228.xlsx");
    file.restore();
  });
});
