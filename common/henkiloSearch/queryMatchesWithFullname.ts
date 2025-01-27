export function queryMatchesWithFullname(hakusana: string, etunimi: string, sukunimi: string) {
  return (
    (etunimi.toLowerCase() + ", " + sukunimi.toLowerCase()).includes(hakusana.toLowerCase()) ||
    (etunimi.toLowerCase() + " " + sukunimi.toLowerCase()).includes(hakusana.toLowerCase())
  );
}
