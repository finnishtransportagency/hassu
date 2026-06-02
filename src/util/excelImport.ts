// Contains code generated or recommended by Amazon Q
import { OMISTAJA_EXCEL_HEADERS } from "common/excelConstants";
import { OMISTAJA_EXCEL_SHEETS } from "common/excelConstants";
import lookup from "country-code-lookup";

export type ExcelColumnIndices = {
  kiinteistotunnus: number;
  nimi: number;
  postiosoite: number;
  postinumero: number;
  postitoimipaikka: number;
  maa: number;
  headerRowIndex: number;
};

export function findColumnIndices(rows: unknown[][]): ExcelColumnIndices | null {
  const headerRow = rows.find((row) => row.some((cell) => String(cell ?? "").trim() === OMISTAJA_EXCEL_HEADERS.kiinteistotunnus));
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
    maa: indexOf(OMISTAJA_EXCEL_HEADERS.maa),
    headerRowIndex: rows.indexOf(headerRow),
  };
}

const regionNames = new Intl.DisplayNames("fi", { type: "region" });

export function countryNameToIso2(name: string): string | null {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  const match = lookup.countries.find((c) => regionNames.of(c.iso2)?.toLowerCase() === trimmed);
  return match?.iso2 ?? null;
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
  maakoodi: string | null;
};

export type ExcelImportError = {
  type: "unknown_country";
  rowIndex: number;
  omistajaIndex: number;
  value: string;
};

export type ExcelImportOutput = {
  results: ExcelImportResult[];
  errors: ExcelImportError[];
};

export function matchExcelRowsToOmistajat(
  rows: unknown[][],
  columns: ExcelColumnIndices,
  omistajat: OmistajaMatchInput[]
): ExcelImportOutput {
  const dataRows = rows.slice(columns.headerRowIndex + 1);
  const results: ExcelImportResult[] = [];
  const errors: ExcelImportError[] = [];

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
      const maaStr = columns.maa >= 0 ? String(matchingRow[columns.maa] ?? "").trim() : "";

      let maakoodi: string | null = null;
      if (maaStr) {
        maakoodi = countryNameToIso2(maaStr);
        if (!maakoodi) {
          const rowIndex = dataRows.indexOf(matchingRow) + columns.headerRowIndex + 2;
          errors.push({ type: "unknown_country", rowIndex, omistajaIndex: i, value: maaStr });
        }
      }

      results.push({ index: i, jakeluosoite, postinumero, paikkakunta, maakoodi });
    }
  }

  return { results, errors };
}

/**
 * Determines which sheet to read from an Excel file.
 * If multiple sheets, reads "Muut kiinteistönomistajat" sheet.
 * If single sheet, reads that one.
 * Returns 1-based sheet index.
 */
export function getSheetIndexToRead(sheetNames: string[]): number {
  if (sheetNames.length > 1) {
    const muutIndex = sheetNames.indexOf(OMISTAJA_EXCEL_SHEETS.muutKiinteistonomistajat);
    return muutIndex >= 0 ? muutIndex + 1 : 1;
  }
  return 1;
}
