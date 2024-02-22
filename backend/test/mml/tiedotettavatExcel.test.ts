import { Vaihe } from "hassu-common/graphql/apiModel";
import { DBProjekti, DBVaylaUser } from "../../src/database/model";
import { generateExcel, generateExcelByQuery } from "../../src/mml/tiedotettavatExcel";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DBOmistaja } from "../../src/database/omistajaDatabase";
import readXlsxFile from "read-excel-file/node";
import { expect } from "chai";
import { identifyMockUser } from "../../src/user/userService";

const projekti: Partial<DBProjekti> = {
  oid: "1.2.3",
  kayttoOikeudet: [{ kayttajatunnus: "testuid" } as unknown as DBVaylaUser],
};
const omistaja1: DBOmistaja = {
  id: "1",
  kaytossa: true,
  kiinteistotunnus: "123-456",
  lisatty: "2024-02-21 10:01:12+02:00",
  oid: projekti.oid!,
  etunimet: "Etunimi",
  sukunimi: "Sukunimi",
  jakeluosoite: "Osoite 1",
  postinumero: "00100",
  paikkakunta: "Helsinki",
  suomifiLahetys: true,
};
const omistaja2: DBOmistaja = {
  id: "2",
  kaytossa: true,
  kiinteistotunnus: "123-456",
  lisatty: "2024-02-21 10:01:12+02:00",
  oid: projekti.oid!,
  etunimet: "Etunimi2",
  sukunimi: "Sukunimi2",
  jakeluosoite: "Osoite 2",
  postinumero: "01600",
  paikkakunta: "Vantaa",
  suomifiLahetys: true,
};
const omistaja3: DBOmistaja = {
  id: "3",
  kaytossa: true,
  kiinteistotunnus: "123-456",
  lisatty: "2024-02-21 10:01:12+02:00",
  oid: projekti.oid!,
  etunimet: "Etunimi3",
  sukunimi: "Sukunimi3",
  jakeluosoite: "Osoite 3",
  postinumero: "02600",
  paikkakunta: "Espoo",
  suomifiLahetys: false,
};
const omistaja4: DBOmistaja = {
  id: "4",
  kaytossa: true,
  kiinteistotunnus: "123-456",
  lisatty: "2024-02-21 10:01:12+02:00",
  oid: projekti.oid!,
  nimi: "Yritys Oy Ab",
  jakeluosoite: "Osoite 4",
  postinumero: "96101",
  paikkakunta: "Rovaniemi",
  suomifiLahetys: false,
};
const omistaja5: DBOmistaja = {
  id: "5",
  kaytossa: true,
  kiinteistotunnus: "123-456",
  lisatty: "2024-02-21 10:01:12+02:00",
  paivitetty: "2024-02-22 08:43:12+02:00",
  oid: projekti.oid!,
  suomifiLahetys: false,
};
describe("tiedotettavatExcel", () => {
  before(() => {
    identifyMockUser({ roolit: ["hassu_admin"], etunimi: "Test", sukunimi: "Test", uid: "testuid", __typename: "NykyinenKayttaja" });
    mockClient(DynamoDBDocumentClient)
      .on(QueryCommand)
      .resolves({ Items: [omistaja1, omistaja2, omistaja3, omistaja4, omistaja5] })
      .on(GetCommand)
      .resolves({ Item: projekti });
  });
  it("tallenna kiinteistön omistajat excel tiedostoon nähtävilläolo", async () => {
    const buffer = await generateExcel(projekti as DBProjekti, true, Vaihe.NAHTAVILLAOLO, "2024-02-21");
    let rows = await readXlsxFile(buffer, { sheet: "Suomi.fi kiinteistön omistajat" });
    expect(rows).toMatchSnapshot();
    rows = await readXlsxFile(buffer, { sheet: "Muut kiinteistön omistajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna kiinteistön omistajat excel tiedostoon hyväksymispäätös", async () => {
    const buffer = await generateExcel(projekti as DBProjekti, true, Vaihe.HYVAKSYMISPAATOS, "2024-02-21");
    let rows = await readXlsxFile(buffer, { sheet: "Suomi.fi kiinteistön omistajat" });
    expect(rows).toMatchSnapshot();
    rows = await readXlsxFile(buffer, { sheet: "Muut kiinteistön omistajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna kiinteistön omistajat excel tiedostoon Suomi.fi", async () => {
    const buffer = await generateExcel(projekti as DBProjekti, true, undefined, undefined, true);
    const rows = await readXlsxFile(buffer, { sheet: "Suomi.fi kiinteistön omistajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna kiinteistön omistajat excel tiedostoon muut", async () => {
    const buffer = await generateExcel(projekti as DBProjekti, true, undefined, undefined, false);
    const rows = await readXlsxFile(buffer, { sheet: "Muut kiinteistön omistajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna kiinteistön omistajat excel tiedostoon graphql Suomi.fi", async () => {
    const excel = await generateExcelByQuery({ kiinteisto: true, oid: "1.2.3", suomifi: true });
    const rows = await readXlsxFile(Buffer.from(excel.sisalto, "base64"), { sheet: "Suomi.fi kiinteistön omistajat" });
    expect(rows).toMatchSnapshot();
  });
  it("tallenna kiinteistön omistajat excel tiedostoon graphql muut", async () => {
    const excel = await generateExcelByQuery({ kiinteisto: true, oid: "1.2.3", suomifi: false });
    const rows = await readXlsxFile(Buffer.from(excel.sisalto, "base64"), { sheet: "Muut kiinteistön omistajat" });
    expect(rows).toMatchSnapshot();
  });
});
