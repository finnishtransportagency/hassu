export function formatNimi(nimi: { etunimi: string; sukunimi: string } | null | undefined): string {
  if (!nimi) {
    return "";
  }
  const { etunimi, sukunimi } = nimi;
  return etunimi + " " + sukunimi;
}
