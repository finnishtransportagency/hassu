import { ProjektinJakautuminen } from "../database/model";

// Toistaiseksi on rajoitus, että projektin voi jakaa kertaalleen. Haetaan yksi (ainoa) liittyvä projekti
// Tietokantaratkaisu on toteutettu tukemaan tilannetta, jossa projekti jaetaan useampaan kertaan
export const haeJaetunProjektinOid = (projektinJakautuminen: ProjektinJakautuminen | undefined): string | undefined =>
  [...(projektinJakautuminen?.jaettuProjekteihin ?? []), projektinJakautuminen?.jaettuProjektista].find((oid) => !!oid);
