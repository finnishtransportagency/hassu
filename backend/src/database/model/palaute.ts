export type Palaute = {
  oid: string;
  id: string;
  vastaanotettu: string;
  etunimi?: string | null;
  sukunimi?: string | null;
  sahkoposti?: string | null;
  puhelinnumero?: string | null;
  kysymysTaiPalaute?: string | null;
  liite?: string | null;
  liitteet?: string[] | null;
  vastattu?: boolean | null;
};
