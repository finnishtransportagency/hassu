export function isAorL(uid: string | undefined | null): boolean {
  if (uid) {
    return isATunnus(uid) || isLTunnus(uid);
  }
  return false;
}

function isATunnus(uid: string) {
  if (uid) {
    return !!uid.match(/^A[\d]+/)?.pop();
  }
  return false;
}

function isLTunnus(uid: string) {
  if (uid) {
    return !!uid.match(/^L[\d]+/)?.pop();
  }
  return false;
}

export function formatNimi(nimi: { etunimi: string; sukunimi: string } | null | undefined): string {
  if (!nimi) {
    return "";
  }
  const { etunimi, sukunimi } = nimi;
  return etunimi + " " + sukunimi;
}
