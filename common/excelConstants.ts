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
export const OMISTAJA_EXCEL_HEADERS = {
  kiinteistotunnus: "Kiinteistötunnus",
  nimi: "Omistajan nimi",
  postiosoite: "Postiosoite",
  postinumero: "Postinumero",
  postitoimipaikka: "Postitoimipaikka",
  maa: "Maa",
  tiedotHaettu: "Tiedot haettu",
  tiedotustapa: "Tiedotustapa",
  lahetysaika: "Lähetysaika",
} as const;

export const OMISTAJA_EXCEL_SHEETS = {
  suomifiKiinteistonomistajat: "Suomi.fi kiinteistönomistajat",
  muutKiinteistonomistajat: "Muut kiinteistönomistajat",
  suomifiMuistuttajat: "Suomi.fi muistuttajat",
  muutMuistuttajat: "Muut muistuttajat",
} as const;
