import { Aineisto, AineistoInput } from "./graphql/apiModel";

type PaaAineistoKategoriaProps = AineistoKategoriaProps & {
  alakategoriat?: AineistoKategoriaProps[];
};

type HakuLauseet = (string | RegExp)[];

type AineistoKategoriaProps = {
  id: string;
  hakulauseet?: HakuLauseet;
};

export abstract class AineistoKategoria {
  private readonly props: AineistoKategoriaProps;
  constructor(props: AineistoKategoriaProps) {
    this.props = props;
  }

  public get id(): string {
    return this.props.id;
  }

  public get hakulauseet(): HakuLauseet | undefined {
    return this.props.hakulauseet;
  }
}

export class PaaAineistoKategoria extends AineistoKategoria {
  private readonly childKategoriat?: AlaAineistoKategoria[];

  constructor(props: PaaAineistoKategoriaProps) {
    super(props);
    this.childKategoriat = props.alakategoriat?.map((alakategoriaProps) => new AlaAineistoKategoria(alakategoriaProps, this), this);
  }

  public get alaKategoriat(): AineistoKategoria[] | undefined {
    return this.childKategoriat;
  }
}

export class AlaAineistoKategoria extends AineistoKategoria {
  private readonly parent?: PaaAineistoKategoria;

  constructor(props: AineistoKategoriaProps, parent?: PaaAineistoKategoria) {
    super(props);
    this.parent = parent;
  }

  public get parentKategoria(): PaaAineistoKategoria | undefined {
    return this.parent;
  }
}

export class AineistoKategoriat {
  private readonly ylaKategoriat: PaaAineistoKategoria[];

  constructor(aineistoKategoriat: PaaAineistoKategoriaProps[]) {
    this.ylaKategoriat = aineistoKategoriat.map((kategoria) => new PaaAineistoKategoria(kategoria));
  }

  public listKategoriat(): PaaAineistoKategoria[] {
    return this.ylaKategoriat;
  }

  public listKategoriaIds(): string[] {
    return getNestedCategoryIds(this.ylaKategoriat);
  }

  public findKategoria(aineistoKuvaus: string | undefined, tiedostoNimi: string): AineistoKategoria | undefined {
    const ylakategoria = findMatchingCategory(this.ylaKategoriat, aineistoKuvaus, undefined);
    if (ylakategoria) {
      const alakategoria = findMatchingCategory(ylakategoria.alaKategoriat, aineistoKuvaus, tiedostoNimi);
      if (alakategoria) {
        return alakategoria;
      }
    }
    return ylakategoria;
  }

  public findById(id: string): AineistoKategoria | undefined {
    for (const ylaKategoria of this.ylaKategoriat) {
      if (ylaKategoria.id == id) {
        return ylaKategoria;
      }
      for (const alaKategoria of ylaKategoria.alaKategoriat || []) {
        if (alaKategoria.id == id) {
          return alaKategoria;
        }
      }
    }
  }
}

export const getNestedCategoryIds: (kategoriat: AineistoKategoria[]) => string[] = (kategoriat) => {
  const kategoriaIds: string[] = [];
  kategoriat.forEach((kategoria) => {
    kategoriaIds.push(kategoria.id);
    if (kategoria instanceof PaaAineistoKategoria && kategoria.alaKategoriat) {
      kategoriaIds.push(...getNestedCategoryIds(kategoria.alaKategoriat));
    }
  });
  return kategoriaIds;
};

export function kategorianAllaOlevienAineistojenMaara(aineistoNahtavilla: Aineisto[], kategoria: AineistoKategoria): number {
  const kategorianAineistojenMaara = aineistoNahtavilla.filter((aineisto) => aineisto.kategoriaId === kategoria.id).length;
  if (!(kategoria instanceof PaaAineistoKategoria) || !kategoria.alaKategoriat || kategoria.alaKategoriat.length === 0) {
    return kategorianAineistojenMaara;
  } else {
    return kategoria.alaKategoriat.reduce((acc, kategoria) => {
      return acc + kategorianAllaOlevienAineistojenMaara(aineistoNahtavilla, kategoria);
    }, kategorianAineistojenMaara);
  }
}

export function getNestedAineistoMaaraForCategory(aineistot: (Aineisto | AineistoInput)[], kategoria: AineistoKategoria): number {
  let nestedAineistoMaaraSum = 0;
  const ids = getNestedCategoryIds([kategoria]);
  nestedAineistoMaaraSum += aineistot.filter(({ kategoriaId }) => kategoriaId && ids.includes(kategoriaId)).length;
  return nestedAineistoMaaraSum;
}

function isMatchingToHakulauseet(hakulauseet: HakuLauseet | undefined, keyword: string | undefined): boolean {
  return !!hakulauseet?.find((hakulause) => !!keyword?.match(new RegExp(hakulause, "i")));
}

function findMatchingCategory<T extends AineistoKategoria>(
  kategoriat: T[] | undefined,
  aineistoKuvaus: string | undefined,
  tiedostoNimi: string | undefined
): T | undefined {
  if (!aineistoKuvaus && !tiedostoNimi) {
    return undefined;
  }
  if (kategoriat) {
    return kategoriat
      .filter(
        (kategoria) =>
          isMatchingToHakulauseet(kategoria.hakulauseet, aineistoKuvaus) || isMatchingToHakulauseet(kategoria.hakulauseet, tiedostoNimi)
      )
      .pop();
  }
}

export const aineistoKategoriat = new AineistoKategoriat([
  {
    id: "osa_a",
    hakulauseet: paaKategoriaKuvausRegexp(["T100", "Osa A"]),
    alakategoriat: [
      { id: "kaavakartat", hakulauseet: ["Kaavakartat", "Kaava", "1.7T", "T119"] },
      {
        id: "suunnitteluprosessiin_liittyva_aineisto",
        hakulauseet: ["Suunnitteluprosessiin_liittyvä_aineisto", "1.6T", "Kuulutus", "Kutsu", "Esittelymateriaali"],
      },
      { id: "yva", hakulauseet: ["Ympäristövaikutusten_arviointi_(YVA)", "T120", "Yhteysviranomaisen perusteltu päätelmä", "YVA"] },
    ],
  },
  {
    id: "osa_b",
    hakulauseet: paaKategoriaKuvausRegexp(["T200", "Osa B"]),
    alakategoriat: [
      { id: "yleiskartat", hakulauseet: ["Yleiskartat", "T212", "Yleiskartta", "2.1T"] },
      {
        id: "hallinnollisten_jarjestelyiden_kartat",
        hakulauseet: ["Hallinnollisten_järjestelyiden_kartat", "Hallinnollisten järjestelyiden kartat", "T213", "2.2T"],
      },
      { id: "suunnitelmakartat", hakulauseet: ["Suunnitelmakartat", "Suunnitelmakartta", "T214", "3T"] },
      { id: "pituusleikkaukset", hakulauseet: ["Pituusleikkaukset", "Pituusleikkaus", "T216", "5T"] },
      { id: "poikkileikkaukset", hakulauseet: ["Poikkileikkaukset", "Poikkileikkaus", "T215", "4T"] },
      {
        id: "siltasuunnitelmat_ja_muut_taitorakenteet",
        hakulauseet: [
          "Siltasuunnitelmat_ja_muut_taitorakenteet",
          "Siltasuunnitelmat ja muut taitorakenteet",
          "15T",
          "Sillan yleispiirustus",
        ],
      },
      { id: "ymparistorakenteet_esim_meluesteet", hakulauseet: ["Ympäristörakenteet_esim_meluesteet"] },
      { id: "lunastuskartat", hakulauseet: ["Lunastuskartat"] },
      { id: "liikennepaikkojen_suunnitelmat", hakulauseet: ["Liikennepaikkojen_suunnitelmat"] },
      { id: "maanteiden_liittyvat_toimenpiteet_ratasuunnitelmassa", hakulauseet: ["Maanteiden_liittyvät_toimenpiteet_ratasuunnitelmassa"] },
      { id: "rataan_liittyvat_toimenpiteet_tiesuunnitelmassa", hakulauseet: ["Rataan_liittyvät_toimenpiteet_tiesuunnitelmassa"] },
      { id: "muut_piirustukset_ja_kuvat", hakulauseet: ["Muut_piirustukset_ja_kuvat"] },
    ],
  },
  {
    id: "osa_c",
    hakulauseet: paaKategoriaKuvausRegexp(["T300", "Osa C"]),
    alakategoriat: [
      { id: "vaikutuksia_kuvaavat_selvitykset", hakulauseet: ["Vaikutuksia_kuvaavat_selvitykset"] },
      { id: "ulkopuoliset_rakenteet", hakulauseet: ["Ulkopuoliset_rakenteet"] },
      { id: "tutkitut_vaihtoehdot", hakulauseet: ["Tutkitut_vaihtoehdot"] },
      { id: "katusuunnitelmat", hakulauseet: ["Katusuunnitelmat"] },
      { id: "visualisointikuvat", hakulauseet: ["Visualisointikuvat"] },
      { id: "ymparistosuunnitelmat", hakulauseet: ["Ympäristösuunnitelmat"] },
      { id: "muut_selvitykset", hakulauseet: ["Muut_selvitykset"] },
      { id: "valaistuksen_ja_liikenteenohjauksen_yleiskartat", hakulauseet: ["Valaistuksen_ja_liikenteenohjauksen_yleiskartat"] },
      { id: "johtosiirrot_ja_kunnallistekniset_suunnitelmat", hakulauseet: ["Johtosiirrot_ja_kunnallistekniset_suunnitelmat"] },
    ],
  },
]);

/**
 *
 * @param keywords hakusanat, joita haetaan projektivelhon kuvaus kentästä
 * @returns RegExpit, joilla voidaan matchata joko keywordeilla alkava ja päättyvä merkkijono tai merkkijono, jossa keyword löytyy ja sen ympärillä on /-merkki
 */
function paaKategoriaKuvausRegexp(keywords: string[]): RegExp[] {
  const slashPrefixRegexp = "^(.*/)?";
  const slashSuffixRegexp = "(/.*)?$";
  return keywords.map((keyword) => new RegExp(slashPrefixRegexp + keyword + slashSuffixRegexp, "i"));
}
