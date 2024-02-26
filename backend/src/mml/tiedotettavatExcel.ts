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

function formatKiinteistotunnus(tunnus: string) {
  return `${Number(tunnus.substring(0, 3))}-${Number(tunnus.substring(3, 6))}-${Number(tunnus.substring(6, 10))}-${Number(tunnus.substring(10))}`
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

function lisaaMuistuttajaRivi(rivi: Rivi) {
  auditLog.info("Lisätään muistuttajan tiedot exceliin", { muistuttajaId: rivi.id });
  return [
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

function lisaaRivi(rivi: Rivi) {
  auditLog.info("Lisätään omistajan tiedot exceliin", { omistajaId: rivi.id });
  return [
    {
      value: formatKiinteistotunnus(rivi.kiinteistotunnus!),
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

function lisaaOtsikko() {
  return [
    {
      value: "Kiinteistötunnus",
    },
    {
      value: "Omistajan nimi",
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

function lisaaMuistuttajanOtsikko() {
  return [
    {
      value: "Muistuttajan nimi",
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

type Rivi = {
  id: string;
  kiinteistotunnus?: string;
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
        nimi: o.nimi ? o.nimi : `${o.etunimet ?? ""} ${o.sukunimi ?? ""}`,
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
        nimi: `${m.etunimi} ${m.sukunimi}`,
        postiosoite: m.lahiosoite ?? "",
        postinumero: m.postinumero ?? "",
        postitoimipaikka: m.postitoimipaikka ?? "",
        haettu: m.paivitetty ?? m.lisatty,
        tiedotustapa: m.henkilotunnus ? "Suomi.fi" : "Kirjeitse",
        suomifiLahetys: !!m.henkilotunnus,
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
    data[0].push(lisaaOtsikko());
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
    data[1].push(lisaaOtsikko());
    for (const omistaja of omistajat.filter((o) => !o.suomifiLahetys)) {
      data[1].push(lisaaRivi(omistaja));
    }
    if (vaihe === Vaihe.HYVAKSYMISPAATOS) {
      sheets.push("Suomi.fi muistuttajat", "Muut muistuttajat");
      data[2] = [];
      data[2].push([
        {
          value: "Kuulutus suunnitelman hyväksymisestä",
          fontWeight: "bold",
        },
      ]);
      data[2].push([{ value: formatDate(kuulutusPaiva, "DD.MM.YYYY") }]);
      data[2].push([{ value: "Muistuttajien tiedotus Suomi.fi -palvelulla", fontWeight: "bold" }]);
      data[2].push(lisaaMuistuttajanOtsikko());
      const muistuttajat = await haeRivit(projekti.oid, false);
      for (const muistuttaja of muistuttajat.filter((o) => o.suomifiLahetys)) {
        data[2].push(lisaaMuistuttajaRivi(muistuttaja));
      }
      data[3] = [];
      data[3].push([
        {
          value: "Kuulutus suunnitelman hyväksymisestä",
          fontWeight: "bold",
        },
      ]);
      data[3].push([{ value: formatDate(kuulutusPaiva, "DD.MM.YYYY") }]);
      data[3].push([{ value: "Muistuttajien tiedotus muilla tavoin", fontWeight: "bold" }]);
      data[3].push(lisaaMuistuttajanOtsikko());
      for (const muistuttaja of muistuttajat.filter((o) => !o.suomifiLahetys)) {
        data[3].push(lisaaMuistuttajaRivi(muistuttaja));
      }
    }
  } else if (suomifi) {
    sheets.push(kiinteisto ? "Suomi.fi kiinteistön omistajat" : "Suomi.fi muistuttajat");
    data[0].push(kiinteisto ? lisaaOtsikko() : lisaaMuistuttajanOtsikko());
    const rivit = await haeRivit(projekti.oid, kiinteisto);
    for (const rivi of rivit.filter((o) => o.suomifiLahetys)) {
      data[0].push(rivi.kiinteisto ? lisaaRivi(rivi) : lisaaMuistuttajaRivi(rivi));
    }
  } else {
    sheets.push(kiinteisto ? "Muut kiinteistön omistajat" : "Muut muistuttajat");
    data[0].push(kiinteisto ? lisaaOtsikko() : lisaaMuistuttajanOtsikko());
    const rivit = await haeRivit(projekti.oid, kiinteisto);
    for (const rivi of rivit.filter((o) => !o.suomifiLahetys)) {
      data[0].push(rivi.kiinteisto ? lisaaRivi(rivi) : lisaaMuistuttajaRivi(rivi));
    }
  }
  const columnWidths = (_value: string, idx: number) =>  {
    if (idx < 2) {
      return [{ width: 20 }, { width: 30 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 25 }, { width: 10 }];
    } else {
      return [{ width: 30 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 25 }, { width: 10 }];
    }
  };
  return writeXlsxFile(data, {
    buffer: true,
    stickyRowsCount: vaihe === undefined ? 1 : 4,
    sheets,
    columns: sheets.map(columnWidths),
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
