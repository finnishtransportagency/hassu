import writeXlsxFile from "write-excel-file/node";
import { DBProjekti } from "../database/model";
import dayjs from "dayjs";
import { Excel, LataaTiedotettavatExcelQueryVariables, Vaihe } from "hassu-common/graphql/apiModel";
import { omistajaDatabase } from "../database/omistajaDatabase";
import { SheetData } from "write-excel-file";
import { requirePermissionMuokkaaProjekti } from "../projekti/projektiHandler";
import { auditLog, log } from "../logger";
import { fileService } from "../files/fileService";
import { PathTuple } from "../files/ProjektiPath";
import { muistuttajaDatabase } from "../database/muistuttajaDatabase";

const CONTENT_TYPE_EXCEL = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function formatDate(date: string | undefined | null, format = "DD.MM.YYYY HH:mm:ssZ") {
  if (date) {
    const pvm = Date.parse(date);
    return dayjs(pvm).format(format);
  } else {
    return "";
  }
}

export async function generateExcelByQuery(variables: LataaTiedotettavatExcelQueryVariables): Promise<Excel> {
  const projekti = await requirePermissionMuokkaaProjekti(variables.oid);
  const file = await generateExcel(projekti, variables.kiinteisto, undefined, undefined, variables.suomifi);
  return {
    __typename: "Excel",
    nimi: `${variables.kiinteisto ? "kiinteistonomistajat" : "muistuttajat"}-${variables.suomifi ? "suomifi" : "muut"}-${variables.oid}.xlsx`,
    sisalto: file.toString("base64"),
    tyyppi: CONTENT_TYPE_EXCEL,
  };
}

function lisaaRivi(rivi: Rivi) {
  if (rivi.kiinteisto) {
    auditLog.info("Lisätään omistajan tiedot exceliin", { omistajaId: rivi.id });
  } else {
    auditLog.info("Lisätään muistuttajan tiedot exceliin", { muistuttajaId: rivi.id });
  }
  return [
    {
      value: rivi.kiinteistotunnus,
    },
    {
      value: rivi.nimi,
    },
    {
      value: rivi.postiosoite,
    },
    {
      value: rivi.postinumero,
    },
    {
      value: rivi.postitoimipaikka,
    },
    {
      value: formatDate(rivi.haettu),
    },
    {
      value: rivi.tiedotustapa,
    },
  ];
}

function lisaaOtsikko(kiinteisto: boolean) {
  return [
    {
      value: "Kiinteistötunnus",
    },
    {
      value: kiinteisto ? "Omistajan nimi" : "Muistuttajan nimi",
    },
    {
      value: "Postiosoite",
    },
    {
      value: "Postinumero",
    },
    {
      value: "Postitoimipaikka",
    },
    {
      value: "Tiedot haettu",
    },
    {
      value: "Tiedotustapa",
    },
  ];
}

function columnWidths() {
  return [{ width: 20 }, { width: 30 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 25 }, { width: 10 }];
}

type Rivi = {
  id: string;
  kiinteistotunnus: string;
  nimi: string;
  postiosoite: string;
  postinumero: string;
  postitoimipaikka: string;
  haettu: string;
  tiedotustapa: string;
  suomifiLahetys: boolean | undefined;
  kiinteisto: boolean;
};

async function haeRivit(oid: string, kiinteisto: boolean): Promise<Rivi[]> {
  if (kiinteisto) {
    return (await omistajaDatabase.haeProjektinKaytossaolevatOmistajat(oid)).map((o) => {
      return {
        id: o.id,
        kiinteistotunnus: o.kiinteistotunnus,
        nimi: `${o.etunimet} ${o.sukunimi}`,
        postiosoite: o.jakeluosoite ?? "",
        postinumero: o.postinumero ?? "",
        postitoimipaikka: o.paikkakunta ?? "",
        haettu: o.paivitetty ?? o.lisatty,
        tiedotustapa: o.suomifiLahetys ? "Suomi.fi" : "Kirjeitse",
        suomifiLahetys: o.suomifiLahetys,
        kiinteisto,
      };
    });
  } else {
    return (await muistuttajaDatabase.haeProjektinKaytossaolevatMuistuttajat(oid)).map((m) => {
      return {
        id: m.id,
        kiinteistotunnus: "",
        nimi: `${m.etunimi} ${m.sukunimi}`,
        postiosoite: m.lahiosoite ?? "",
        postinumero: m.postinumero ?? "",
        postitoimipaikka: m.postitoimipaikka ?? "",
        haettu: m.paivitetty ?? m.lisatty,
        tiedotustapa: m.henkilotunnus ? "Suomi.fi" : "Kirjeitse",
        suomifiLahetys: m.henkilotunnus !== undefined,
        kiinteisto,
      };
    });
  }
}

export async function generateExcel(
  projekti: DBProjekti,
  kiinteisto: boolean,
  vaihe: Vaihe | undefined,
  kuulutusPaiva: string | undefined | null,
  suomifi?: boolean | null
): Promise<Buffer> {
  const data: SheetData[] = [];
  data[0] = [];
  const sheets: string[] = [];
  if (vaihe === Vaihe.NAHTAVILLAOLO || vaihe === Vaihe.HYVAKSYMISPAATOS) {
    sheets.push("Suomi.fi kiinteistön omistajat", "Muut kiinteistön omistajat");
    data[0].push([
      {
        value: vaihe === Vaihe.NAHTAVILLAOLO ? "Kuulutus suunnitelman nähtäville asettamisesta" : "Kuulutus suunnitelman hyväksymisestä",
        fontWeight: "bold",
      },
    ]);
    data[0].push([{ value: formatDate(kuulutusPaiva, "DD.MM.YYYY") }]);
    data[0].push([{ value: "Kiinteistönomistajien tiedotus Suomi.fi -palvelulla", fontWeight: "bold" }]);
    data[0].push(lisaaOtsikko(kiinteisto));
    const omistajat = await haeRivit(projekti.oid, true);
    for (const omistaja of omistajat.filter((o) => o.suomifiLahetys)) {
      data[0].push(lisaaRivi(omistaja));
    }
    data[1] = [];
    data[1].push([
      {
        value: vaihe === Vaihe.NAHTAVILLAOLO ? "Kuulutus suunnitelman nähtäville asettamisesta" : "Kuulutus suunnitelman hyväksymisestä",
        fontWeight: "bold",
      },
    ]);
    data[1].push([{ value: formatDate(kuulutusPaiva, "DD.MM.YYYY") }]);
    data[1].push([{ value: "Kiinteistönomistajien tiedotus muilla tavoin", fontWeight: "bold" }]);
    data[1].push(lisaaOtsikko(kiinteisto));
    for (const omistaja of omistajat.filter((o) => !o.suomifiLahetys)) {
      data[1].push(lisaaRivi(omistaja));
    }
  } else if (suomifi) {
    sheets.push(kiinteisto ? "Suomi.fi kiinteistön omistajat" : "Suomi.fi muistuttajat");
    data[0].push(lisaaOtsikko(kiinteisto));
    const rivit = await haeRivit(projekti.oid, kiinteisto);
    for (const omistaja of rivit.filter((o) => o.suomifiLahetys)) {
      data[0].push(lisaaRivi(omistaja));
    }
  } else {
    sheets.push(kiinteisto ? "Muut kiinteistön omistajat" : "Muut muistuttajat");
    data[0].push(lisaaOtsikko(kiinteisto));
    const rivit = await haeRivit(projekti.oid, kiinteisto);
    for (const omistaja of rivit.filter((o) => !o.suomifiLahetys)) {
      data[0].push(lisaaRivi(omistaja));
    }
  }
  return writeXlsxFile(data, {
    buffer: true,
    stickyRowsCount: vaihe === undefined ? 1 : 4,
    sheets,
    columns: [columnWidths(), columnWidths()],
  });
}

export async function tallennaMaanomistajaluettelo(
  projekti: DBProjekti,
  path: PathTuple,
  vaihe: Vaihe,
  kuulutusPaiva: string | undefined | null
) {
  log.info("Tallennetaan maanomistajaluettelo projektille", { oid: projekti.oid, path: path.yllapitoPath });
  const fileLocation = "maanomistajaluettelo.xslx";
  return await fileService.createFileToProjekti({
    oid: projekti.oid,
    fileName: fileLocation,
    path,
    contents: await generateExcel(projekti, true, vaihe, kuulutusPaiva),
    contentType: CONTENT_TYPE_EXCEL,
  });
}
