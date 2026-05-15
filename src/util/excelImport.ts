// Contains code generated or recommended by Amazon Q
import { OMISTAJA_EXCEL_HEADERS } from "common/excelHeaders";

export type ExcelColumnIndices = {
  kiinteistotunnus: number;
  nimi: number;
  postiosoite: number;
  postinumero: number;
  postitoimipaikka: number;
  headerRowIndex: number;
};

export function findColumnIndices(rows: unknown[][]): ExcelColumnIndices | null {
  const headerRow = rows.find((row) =>
    row.some((cell) => String(cell ?? "").trim() === OMISTAJA_EXCEL_HEADERS.kiinteistotunnus)
  );
  if (!headerRow) {
    return null;
  }
  const indexOf = (header: string) => headerRow.findIndex((cell) => String(cell ?? "").trim() === header);
  return {
    kiinteistotunnus: indexOf(OMISTAJA_EXCEL_HEADERS.kiinteistotunnus),
    nimi: indexOf(OMISTAJA_EXCEL_HEADERS.nimi),
    postiosoite: indexOf(OMISTAJA_EXCEL_HEADERS.postiosoite),
    postinumero: indexOf(OMISTAJA_EXCEL_HEADERS.postinumero),
    postitoimipaikka: indexOf(OMISTAJA_EXCEL_HEADERS.postitoimipaikka),
    headerRowIndex: rows.indexOf(headerRow),
  };
}

export type OmistajaMatchInput = {
  kiinteistotunnus?: string | null | undefined;
  nimi?: string | null | undefined;
  [key: string]: unknown;
};

export type ExcelImportResult = {
  index: number;
  jakeluosoite: string;
  postinumero: string;
  paikkakunta: string;
};

export function matchExcelRowsToOmistajat(
  rows: unknown[][],
  columns: ExcelColumnIndices,
  omistajat: OmistajaMatchInput[]
): ExcelImportResult[] {
  const dataRows = rows.slice(columns.headerRowIndex + 1);
  const results: ExcelImportResult[] = [];

  for (let i = 0; i < omistajat.length; i++) {
    const omistaja = omistajat[i];
    const matchingRow = dataRows.find((row) => {
      const excelKiinteistotunnus = String(row[columns.kiinteistotunnus] ?? "").trim();
      const excelNimi = String(row[columns.nimi] ?? "").trim();
      return (
        excelKiinteistotunnus &&
        excelNimi &&
        excelKiinteistotunnus === (omistaja.kiinteistotunnus ?? "").trim() &&
        excelNimi === (omistaja.nimi ?? "").trim()
      );
    });

    if (matchingRow) {
      const jakeluosoite = columns.postiosoite >= 0 ? String(matchingRow[columns.postiosoite] ?? "").trim() : "";
      const postinumero = columns.postinumero >= 0 ? String(matchingRow[columns.postinumero] ?? "").trim() : "";
      const paikkakunta = columns.postitoimipaikka >= 0 ? String(matchingRow[columns.postitoimipaikka] ?? "").trim() : "";

      if (jakeluosoite || postinumero || paikkakunta) {
        results.push({ index: i, jakeluosoite, postinumero, paikkakunta });
      }
    }
  }

  return results;
}
