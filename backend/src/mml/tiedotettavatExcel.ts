import writeXlsxFile from "write-excel-file/node";
import { DBProjekti } from "../database/model";
import dayjs from "dayjs";
import { AsiakirjaTyyppi, Excel, LataaTiedotettavatExcelQueryVariables, ProjektiTyyppi, Vaihe } from "hassu-common/graphql/apiModel";
import { omistajaDatabase } from "../database/omistajaDatabase";
import { Columns, Row_, SheetData } from "write-excel-file";
import { requirePermissionMuokkaaProjekti } from "../projekti/projektiHandler";
import { auditLog, log } from "../logger";
import { fileService } from "../files/fileService";
import { PathTuple } from "../files/ProjektiPath";
import { muistuttajaDatabase } from "../database/muistuttajaDatabase";
import { formatKiinteistotunnusForDisplay } from "hassu-common/util/formatKiinteistotunnus";
import { getLocalizedCountryName } from "hassu-common/getLocalizedCountryName";

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
    nimi: `${variables.kiinteisto ? "Maanomistajaluettelo" : "Muistuttajat"}${
      variables.suomifi ? " (suomi.fi)" : variables.suomifi === false ? " (muilla tavoin)" : ""
    } ${dayjs(new Date()).format("YYYYMMDD")}.xlsx`,
    sisalto: file.toString("base64"),
    tyyppi: CONTENT_TYPE_EXCEL,
  };
}

function getMuistuttajaColumns(): Columns {
  return [{ width: 30 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 20 }, { width: 25 }, { width: 10 }];
}

function getKiinteistonomistajaColumns(): Columns {
  return [{ width: 20 }, { width: 30 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 20 }, { width: 25 }, { width: 10 }];
}

function lisaaMuistuttajaRivi(rivi: Rivi): Row_<ImageData> {
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
      value: rivi.maa,
    },
    {
      value: formatDate(rivi.haettu),
    },
    {
      value: rivi.tiedotustapa,
    },
  ];
}

function lisaaRivi(rivi: Rivi): Row_<ImageData> {
  auditLog.info("Lisätään omistajan tiedot exceliin", { omistajaId: rivi.id });
  return [
    {
      value: formatKiinteistotunnusForDisplay(rivi.kiinteistotunnus),
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
      value: rivi.maa,
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
      value: "Maa",
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
      value: "Maa",
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
  maa: string;
  haettu: string;
  tiedotustapa: string;
  suomifiLahetys: boolean | undefined;
};

async function haeOmistajat(oid: string): Promise<Rivi[]> {
  return (await omistajaDatabase.haeProjektinKaytossaolevatOmistajat(oid))
    .map((o) => {
      return {
        id: o.id,
        kiinteistotunnus: o.kiinteistotunnus ?? "",
        nimi: o.nimi ? o.nimi : `${o.etunimet ?? ""} ${o.sukunimi ?? ""}`,
        postiosoite: o.jakeluosoite ?? "",
        postinumero: o.postinumero ?? "",
        postitoimipaikka: o.paikkakunta ?? "",
        maa: o.maakoodi ? getLocalizedCountryName("fi", o.maakoodi) : "",
        haettu: o.paivitetty ?? o.lisatty,
        tiedotustapa: o.suomifiLahetys ? "Suomi.fi" : "Kirjeitse",
        suomifiLahetys: o.suomifiLahetys,
      };
    })
    .sort((a, b) => a.kiinteistotunnus.localeCompare(b.kiinteistotunnus));
}

async function haeMuistuttajat(oid: string): Promise<Rivi[]> {
  return (await muistuttajaDatabase.haeProjektinKaytossaolevatMuistuttajat(oid))
    .map((m) => {
      return {
        id: m.id,
        nimi: m.nimi ? m.nimi : [m.etunimi, m.sukunimi].filter((n) => !!n).join(" "),
        postiosoite: m.lahiosoite ?? "",
        postinumero: m.postinumero ?? "",
        postitoimipaikka: m.postitoimipaikka ?? "",
        maa: m.maakoodi ? getLocalizedCountryName("fi", m.maakoodi) : "",
        haettu: m.paivitetty ?? m.lisatty,
        tiedotustapa: (m.suomifiLahetys ? "Suomi.fi" : m.tiedotustapa) ?? "",
        suomifiLahetys: !!m.henkilotunnus,
      };
    })
    .sort((a, b) => a.tiedotustapa.localeCompare(b.tiedotustapa));
}

async function lisaaKiinteistonOmistajat(data: SheetData[], oid: string, vaihe: Vaihe, kuulutusPaiva: string | undefined | null) {
  data[0].push([
    {
      value: vaihe === Vaihe.NAHTAVILLAOLO ? "Kuulutus suunnitelman nähtäville asettamisesta" : "Kuulutus suunnitelman hyväksymisestä",
      fontWeight: "bold",
    },
  ]);
  data[0].push([{ value: formatDate(kuulutusPaiva, "DD.MM.YYYY") }]);
  data[0].push([{ value: "Kiinteistönomistajien tiedotus Suomi.fi -palvelulla", fontWeight: "bold" }]);
  data[0].push(lisaaOtsikko());
  const omistajat = await haeOmistajat(oid);
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
}

async function lisaaMuistuttajat(data: SheetData[], oid: string, vaihe: Vaihe, kuulutusPaiva: string | undefined | null) {
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
  const muistuttajat = await haeMuistuttajat(oid);
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
  const columns: Columns[] = [];
  if (vaihe === Vaihe.NAHTAVILLAOLO || vaihe === Vaihe.HYVAKSYMISPAATOS) {
    sheets.push("Suomi.fi kiinteistönomistajat", "Muut kiinteistönomistajat");
    columns.push(getKiinteistonomistajaColumns(), getKiinteistonomistajaColumns());
    await lisaaKiinteistonOmistajat(data, projekti.oid, vaihe, kuulutusPaiva);
    if (vaihe === Vaihe.HYVAKSYMISPAATOS) {
      sheets.push("Suomi.fi muistuttajat", "Muut muistuttajat");
      columns.push(getMuistuttajaColumns(), getMuistuttajaColumns());
      await lisaaMuistuttajat(data, projekti.oid, vaihe, kuulutusPaiva);
    }
  } else if (suomifi) {
    if (kiinteisto) {
      sheets.push("Suomi.fi kiinteistönomistajat");
      columns.push(getKiinteistonomistajaColumns());
      data[0].push(lisaaOtsikko());
      const rivit = await haeOmistajat(projekti.oid);
      for (const rivi of rivit.filter((o) => o.suomifiLahetys)) {
        data[0].push(lisaaRivi(rivi));
      }
    } else {
      sheets.push("Suomi.fi muistuttajat");
      columns.push(getMuistuttajaColumns());
      data[0].push(lisaaMuistuttajanOtsikko());
      const rivit = await haeMuistuttajat(projekti.oid);
      for (const rivi of rivit.filter((o) => o.suomifiLahetys)) {
        data[0].push(lisaaMuistuttajaRivi(rivi));
      }
    }
  } else if (suomifi === false) {
    if (kiinteisto) {
      sheets.push("Muut kiinteistönomistajat");
      data[0].push(lisaaOtsikko());
      columns.push(getKiinteistonomistajaColumns());
      const rivit = await haeOmistajat(projekti.oid);
      for (const rivi of rivit.filter((o) => !o.suomifiLahetys)) {
        data[0].push(lisaaRivi(rivi));
      }
    } else {
      sheets.push("Muut muistuttajat");
      data[0].push(lisaaMuistuttajanOtsikko());
      columns.push(getMuistuttajaColumns());
      const rivit = await haeMuistuttajat(projekti.oid);
      for (const rivi of rivit.filter((o) => !o.suomifiLahetys)) {
        data[0].push(lisaaMuistuttajaRivi(rivi));
      }
    }
  } else {
    data[1] = [];
    if (kiinteisto) {
      sheets.push("Suomi.fi kiinteistönomistajat");
      sheets.push("Muut kiinteistönomistajat");
      data[0].push(lisaaOtsikko());
      data[1].push(lisaaOtsikko());
      columns.push(getKiinteistonomistajaColumns(), getKiinteistonomistajaColumns());
      const rivit = await haeOmistajat(projekti.oid);
      for (const rivi of rivit) {
        if (rivi.suomifiLahetys) {
          data[0].push(lisaaRivi(rivi));
        } else {
          data[1].push(lisaaRivi(rivi));
        }
      }
    } else {
      sheets.push("Suomi.fi muistuttajat");
      sheets.push("Muut muistuttajat");
      data[0].push(lisaaMuistuttajanOtsikko());
      data[1].push(lisaaMuistuttajanOtsikko());
      columns.push(getMuistuttajaColumns(), getMuistuttajaColumns());
      const rivit = await haeMuistuttajat(projekti.oid);
      for (const rivi of rivit) {
        if (rivi.suomifiLahetys) {
          data[0].push(lisaaMuistuttajaRivi(rivi));
        } else {
          data[1].push(lisaaMuistuttajaRivi(rivi));
        }
      }
    }
  }
  return writeXlsxFile(data, {
    buffer: true,
    stickyRowsCount: vaihe === undefined ? 1 : 4,
    sheets,
    columns,
  });
}

function getMaanomistajaluetteloFilename(
  tyyppi: ProjektiTyyppi | undefined | null,
  vaihe: Vaihe,
  kuulutusPaiva: string | null | undefined,
  id: number
) {
  let prefix;
  if (tyyppi === ProjektiTyyppi.RATA) {
    prefix = "R417";
  } else if (tyyppi === ProjektiTyyppi.YLEINEN) {
    prefix = "Y416";
  } else {
    prefix = "T416";
  }
  if (vaihe === Vaihe.NAHTAVILLAOLO) {
    return `${prefix} Maanomistajaluettelo ${formatDate(kuulutusPaiva, "YYYYMMDD")}${id === 1 ? "" : " " + id}.xlsx`;
  } else {
    return `${prefix} Maanomistajaluettelo ja muistuttajat ${formatDate(kuulutusPaiva, "YYYYMMDD")}${id === 1 ? "" : " " + id}.xlsx`;
  }
}

export async function tallennaMaanomistajaluettelo(
  projekti: DBProjekti,
  path: PathTuple,
  vaihe: Vaihe,
  kuulutusPaiva: string | undefined | null,
  id: number
) {
  log.info("Tallennetaan maanomistajaluettelo projektille", { path: path.yllapitoPath });
  const fileLocation = getMaanomistajaluetteloFilename(projekti.velho?.tyyppi, vaihe, kuulutusPaiva, id);
  return await fileService.createFileToProjekti({
    oid: projekti.oid,
    fileName: fileLocation,
    path,
    contents: await generateExcel(projekti, true, vaihe, kuulutusPaiva),
    contentType: CONTENT_TYPE_EXCEL,
    asiakirjaTyyppi:
      vaihe === Vaihe.NAHTAVILLAOLO
        ? AsiakirjaTyyppi.MAANOMISTAJALUETTELO_NAHTAVILLAOLO
        : AsiakirjaTyyppi.MAANOMISTAJALUETTELO_HYVAKSYMISPAATOS,
  });
}
