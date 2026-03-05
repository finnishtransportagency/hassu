import {
  NahtavillaoloVaiheJulkaisu,
  HyvaksymisPaatosVaiheJulkaisu,
  JatkoPaatos1VaiheJulkaisu,
  JatkoPaatos2VaiheJulkaisu,
  AloitusKuulutusJulkaisu,
  ProjektiMeta,
} from ".";

const tallennettu: keyof DBProjekti = "tallennettu";
const aloitusKuulutusJulkaisut: keyof DBProjekti = "aloitusKuulutusJulkaisut";
const nahtavillaoloVaiheJulkaisut: keyof DBProjekti = "nahtavillaoloVaiheJulkaisut";
const hyvaksymisPaatosVaiheJulkaisut: keyof DBProjekti = "hyvaksymisPaatosVaiheJulkaisut";
const jatkoPaatos1VaiheJulkaisut: keyof DBProjekti = "jatkoPaatos1VaiheJulkaisut";
const jatkoPaatos2VaiheJulkaisut: keyof DBProjekti = "jatkoPaatos2VaiheJulkaisut";
export const DBPROJEKTI_OMITTED_FIELDS = [
  tallennettu,
  aloitusKuulutusJulkaisut,
  nahtavillaoloVaiheJulkaisut,
  hyvaksymisPaatosVaiheJulkaisut,
  jatkoPaatos1VaiheJulkaisut,
  jatkoPaatos2VaiheJulkaisut,
] as const;
export type DBProjektiOmittedField = (typeof DBPROJEKTI_OMITTED_FIELDS)[number];

/** Data stored in a particular item in Projekti-<env> table */
export type DBProjektiSlim = Omit<ProjektiMeta, "projektiOid" | "sortKey"> & {
  oid: string;
};

export type DBProjektiExtras = {
  aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null;
  nahtavillaoloVaiheJulkaisut?: NahtavillaoloVaiheJulkaisu[] | null;
  hyvaksymisPaatosVaiheJulkaisut?: HyvaksymisPaatosVaiheJulkaisu[] | null;
  jatkoPaatos1VaiheJulkaisut?: JatkoPaatos1VaiheJulkaisu[] | null;
  jatkoPaatos2VaiheJulkaisut?: JatkoPaatos2VaiheJulkaisu[] | null;
  tallennettu?: boolean;
};

// Data combined by joining data from multiple items from multiple tables
export type DBProjekti = DBProjektiSlim & DBProjektiExtras;

// Would it be better to change DBProjekti into the following. Would require a lot of changes in code.
// export type DBProjekti = {
//   meta: ProjektiMeta,
//   aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null;
//   nahtavillaoloVaiheJulkaisut?: NahtavillaoloVaiheJulkaisu[] | null;
//   hyvaksymisPaatosVaiheJulkaisut?: HyvaksymisPaatosVaiheJulkaisu[] | null;
//   jatkoPaatos1VaiheJulkaisut?: JatkoPaatos1VaiheJulkaisu[] | null;
//   jatkoPaatos2VaiheJulkaisut?: JatkoPaatos2VaiheJulkaisu[] | null;
//   tallennettu?: boolean;
// };

export type SaveDBProjektiInput = Partial<DBProjekti> & Pick<DBProjekti, "oid" | "versio">;
export type SaveDBProjektiWithoutLockingInput = Partial<DBProjekti> & Pick<DBProjekti, "oid">;
export type SaveDBProjektiSlimInput = Partial<DBProjektiSlim> & Pick<DBProjektiSlim, "oid" | "versio">;
export type SaveDBProjektiSlimWithoutLockingInput = Partial<DBProjektiSlim> & Pick<DBProjektiSlim, "oid">;
