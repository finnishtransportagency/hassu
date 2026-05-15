// Contains code generated or recommended by Amazon Q

/**
 * Shared Excel column headers for kiinteistönomistaja export/import.
 * Used by:
 * - backend/src/mml/tiedotettavatExcel.ts (export)
 * - src/components/projekti/tiedottaminen/OmistajienMuokkausLomake.tsx (import)
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
