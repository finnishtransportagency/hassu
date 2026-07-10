// Contains code generated or recommended by Amazon Q

/**
 * Shared Excel constants for kiinteistönomistaja/muistuttaja export and import.
 * Used by:
 * - backend/src/mml/tiedotettavatExcel.ts (export)
 * - src/components/projekti/tiedottaminen/OmistajienMuokkausLomake.tsx (import)
 * - src/util/excelImport.ts (import logic)
 *
 * If these change, both export and import will stay in sync.
 */
export const TIEDOTETTAVA_EXCEL_HEADERS = {
  kiinteistotunnus: "Kiinteistötunnus",
  nimiOmistaja: "Omistajan nimi",
  nimiMuistuttaja: "Muistuttajan nimi",
  postiosoite: "Postiosoite",
  postinumero: "Postinumero",
  postitoimipaikka: "Postitoimipaikka",
  maa: "Maa",
  tiedotHaettu: "Tiedot haettu",
  tiedotustapa: "Tiedotustapa",
  lahetysaika: "Lähetysaika",
} as const;

/** @deprecated use TIEDOTETTAVA_EXCEL_HEADERS */
export const OMISTAJA_EXCEL_HEADERS = TIEDOTETTAVA_EXCEL_HEADERS;

export const OMISTAJA_EXCEL_SHEETS = {
  suomifiKiinteistonomistajat: "Suomi.fi kiinteistönomistajat",
  muutKiinteistonomistajat: "Muut kiinteistönomistajat",
  suomifiMuistuttajat: "Suomi.fi muistuttajat",
  muutMuistuttajat: "Muut muistuttajat",
} as const;
