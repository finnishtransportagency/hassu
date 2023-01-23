import { deburr } from "lodash";
import { Aineisto, AineistoInput } from "./graphql/apiModel";

type PaaAineistoKategoriaProps = AineistoKategoriaProps & {
  alakategoriat?: AineistoKategoriaProps[];
};

type AineistoKategoriaProps = {
  id: string;
  hakulauseet?: string[];
};

export abstract class AineistoKategoria {
  private readonly props: AineistoKategoriaProps;
  constructor(props: AineistoKategoriaProps) {
    this.props = props;
  }

  public get id(): string {
    return this.props.id;
  }

  public get hakulauseet(): string[] | undefined {
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

function isMatchingToHakulauseet(hakulauseet: string[] | undefined, keyword: string): boolean {
  const normalizedKeyword = normalizeString(keyword);
  return !!hakulauseet?.find((hakulause) => {
    return !!normalizedKeyword?.match(normalizeString(hakulause));
  });
}

// Matching should be done so that it
// -- diacritical marks are ignored, but base latin characters should match
// -- underscores are evaluated as spaces
// -- capitalization should be ignored
function normalizeString(str: string) {
  return deburr(str).replace(/_/g, " ").toLowerCase();
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
          (aineistoKuvaus && isMatchingToHakulauseet(kategoria.hakulauseet, aineistoKuvaus)) ||
          (tiedostoNimi && isMatchingToHakulauseet(kategoria.hakulauseet, tiedostoNimi))
      )
      .pop();
  }
}

export const aineistoKategoriat = new AineistoKategoriat([
  {
    id: "osa_a",
    hakulauseet: ["100", "Osa A", "A Osa", "Kuulutus", "Selostus", "Sisällysluettelo"],
    alakategoriat: [
      { id: "kaavakartat", hakulauseet: ["Kaava", "Kaavoitus", "1.7T", "119"] },
      {
        id: "suunnitteluprosessiin_liittyva_aineisto",
        hakulauseet: ["Suunnitteluprosessiin liittyvä aineisto", "Kutsu", "Kuulutus", "Esittely", "1.6T"],
      },
      {
        id: "yva",
        hakulauseet: ["Ympäristövaikutusten arviointi", "Päätelmä", "YVA", "Yhteysviranomaisen perusteltu päätelmä", "120", "Kartta-atlas"],
      },
    ],
  },
  {
    id: "osa_b",
    hakulauseet: ["200", "Osa B", "B Osa", "Pääpiirustus", "Pääpiirustukset"],
    alakategoriat: [
      { id: "yleiskartat", hakulauseet: ["Yleiskartta", "Yleiskartat", "212", "2.1T"] },
      {
        id: "hallinnollisten_jarjestelyiden_kartat",
        hakulauseet: ["Hallinnollis", "213", "2.2T"],
      },
      { id: "suunnitelmakartat", hakulauseet: ["Suunnitelmakartta", "Suunnitelmakartat", "214", "3T"] },
      { id: "pituusleikkaukset", hakulauseet: ["Pituusleikkaus", "Pituusleikkaukset", "216", "5T"] },
      { id: "poikkileikkaukset", hakulauseet: ["Poikkileikkaus", "Poikkileikkaukset", "215", "4T"] },
      {
        id: "siltasuunnitelmat_ja_muut_taitorakenteet",
        hakulauseet: ["Silta", "Silto", "Silla", "15T"],
      },
      {
        id: "ymparistorakenteet_esim_meluesteet",
        hakulauseet: [
          "Ympäristöraken",
          "Ympäristösuunnitelm",
          "Ympäristökuv",
          "Melueste",
          "Tukimuuri",
          "Melusein",
          "Tietunnel",
          "Siltatauluk",
          "Siltaluettelo",
          "220",
          "221",
          "223",
          "224",
          "7.2T",
          "7.3T",
        ],
      },
      { id: "lunastuskartat", hakulauseet: ["Lunastus", "Lunastami"] },
      { id: "liikennepaikkojen_suunnitelmat", hakulauseet: ["Liikennepaik"] },
      {
        id: "maanteiden_liittyvat_toimenpiteet_ratasuunnitelmassa",
        hakulauseet: [
          "Maanteiden liittyvät toimenpiteet",
          "Maantien liittyvät toimenpiteet",
          "Maanteihin liittyvät toimenpiteet",
          "Maantiehen liittyvät toimenpiteet",
          "Tiejärjestely",
          "Maanteiden toimenpi",
          "Maantien toimenpi",
          "Liikennetekninen poikkileikkaus",
          "Liikennetekniset poikkileikkaukset",
        ],
      },
      {
        id: "rataan_liittyvat_toimenpiteet_tiesuunnitelmassa",
        hakulauseet: [
          "Ratojen liittyvät toimenpiteet tiesuunnitelmassa",
          "Radan liittyvät toimenpiteet tiesuunnitelmassa",
          "Ratoihin liittyvät toimenpiteet tiesuunnitelmassa",
          "Rataan liittyvät toimenpiteet tiesuunnitelmassa",
          "Ratojen toimenpi",
          "Radan toimenpi",
          "218",
        ],
      },
      {
        id: "muut_piirustukset_ja_kuvat",
        hakulauseet: [
          "Muut piirustukset ja kuvat",
          "Yleiskartta rakentamisen ajaksi",
          "Yleiskartat rakentamisen ajaksi",
          "Käyttöoikeuskart",
          "217",
        ],
      },
    ],
  },
  {
    id: "osa_c",
    hakulauseet: ["300", "Osa C", "C Osa", "Informatiivinen aineisto"],
    alakategoriat: [
      {
        id: "vaikutuksia_kuvaavat_selvitykset",
        hakulauseet: [
          "Selvity",
          "Muuttuvat kulkuyhtey",
          "Muuttuva kulkuyhtey",
          "Simulointitarkastu",
          "Ympäristön suojelukoht",
          "330",
          "330-1",
          "16T",
        ],
      },
      {
        id: "ulkopuoliset_rakenteet",
        hakulauseet: [
          "Ulkopuolisten raken",
          "Ulkopuolisen raken",
          "Ulkopuoliset raken",
          "Ulkopuolinen raken",
          "Ulkopuolisten omistamat raken",
          "Ulkopuolisen omistamat raken",
          "311",
          "6T",
        ],
      },
      { id: "tutkitut_vaihtoehdot", hakulauseet: ["Tutkitut vaihtoehdot", "Tutkittu vaihtoehto", "340", "17T"] },
      {
        id: "katusuunnitelmat",
        hakulauseet: [
          "Katu",
          "Kadut",
          "Pyörätien suunnitelm",
          "Pyöräteiden suunnitelm",
          "Jalkakäytävän suunnitelm",
          "Jalkakäytävien suunnitelm",
          "311",
          "6T",
        ],
      },
      {
        id: "visualisointikuvat",
        hakulauseet: [
          "Visualisointikuv",
          "Havainnekuv",
          "Ote tietomallista",
          "Otteita tietomallista",
          "Rataympäristön käsittelyn periaatekuv",
          "Meluesteiden periaatekuv",
          "Meluesteen periaatekuv",
          "Ympäristökuv",
          "7.4T",
        ],
      },
      {
        id: "ymparistosuunnitelmat",
        hakulauseet: [
          "Ympäristösuunnitelma",
          "Ympäristön nykytilakart",
          "Tieympäristön käsittelyn periaat",
          "Puistosuunnitelma",
          "320",
          "321",
          "322",
          "7.1T",
        ],
      },
      { id: "muut_selvitykset" },
      {
        id: "valaistuksen_ja_liikenteenohjauksen_yleiskartat",
        hakulauseet: ["Valaistu", "Liikenteenohjau", "Viitoitu", "312", "313", "11T", "12T"],
      },
      {
        id: "johtosiirrot_ja_kunnallistekniset_suunnitelmat",
        hakulauseet: ["Johtosiir", "Johto", "Johdot", "Kunnallistekni", "Laite", "Laitteet"],
      },
    ],
  },
]);
