import { deburr } from "lodash";
import { Aineisto } from "./graphql/apiModel";

type GenericAineisto = Pick<Aineisto, "kategoriaId">;

type AineistoKategoriaProps = {
  id: string;
  hakulauseet?: string[];
  alakategoriat?: AineistoKategoriaProps[];
};

export class AineistoKategoria {
  private readonly props: AineistoKategoriaProps;
  private readonly parent?: AineistoKategoria;
  private readonly childKategoriat?: AineistoKategoria[];

  constructor(props: AineistoKategoriaProps, parent?: AineistoKategoria) {
    this.props = props;
    this.parent = parent;
    this.childKategoriat = props.alakategoriat?.map((alakategoriaProps) => new AineistoKategoria(alakategoriaProps, this), this);
  }

  public get id(): string {
    return this.props.id;
  }

  public get parentKategoria(): AineistoKategoria | undefined {
    return this.parent;
  }

  public get hakulauseet(): string[] | undefined {
    return this.props.hakulauseet;
  }
  public get alaKategoriat(): AineistoKategoria[] | undefined {
    return this.childKategoriat;
  }
}

export const kategorisoimattomatId = "kategorisoimattomat";

export class AineistoKategoriat {
  private readonly ylaKategoriat: AineistoKategoria[];

  constructor(aineistoKategoriat: AineistoKategoriaProps[]) {
    this.ylaKategoriat = aineistoKategoriat.map((kategoria) => new AineistoKategoria(kategoria));
  }

  public listKategoriat(showKategorioimattomat?: boolean): AineistoKategoria[] {
    return this.ylaKategoriat.filter((ylakategoria) => ylakategoria !== this.getKategorisoimattomat() || showKategorioimattomat);
  }

  public findYlakategoriaById(kategoriaId: string | null | undefined): AineistoKategoria | undefined {
    return this.ylaKategoriat.find(({ id }) => kategoriaId === id);
  }

  public getKategorisoimattomat(): AineistoKategoria {
    const kategorisoimattomat = this.ylaKategoriat.find(({ id }) => kategorisoimattomatId === id);
    if (!kategorisoimattomat) {
      throw new Error(`Expected to found ylaKategoria with id ${kategorisoimattomatId} but didn't`);
    }
    return kategorisoimattomat;
  }

  public listKategoriaIds(): string[] {
    return getNestedCategoryIds(this.ylaKategoriat);
  }

  public findKategoria(aineistoKuvaus: string | undefined, tiedostoNimi: string): AineistoKategoria {
    const ylakategoria = findMatchingCategory(this.ylaKategoriat, aineistoKuvaus, undefined);
    if (ylakategoria) {
      // Ylakategoria is matched, searching for mathing alakategoria
      const alakategoria = findMatchingCategory(ylakategoria.alaKategoriat, aineistoKuvaus, tiedostoNimi);
      if (alakategoria) {
        return alakategoria;
      }
      return ylakategoria;
    }
    // If ylakategoria is not matched then return kategorisoimaton kategoria
    return this.getKategorisoimattomat();
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
    if (kategoria.alaKategoriat) {
      kategoriaIds.push(...getNestedCategoryIds(kategoria.alaKategoriat));
    }
  });
  return kategoriaIds;
};

export function kategorianAllaOlevienAineistojenMaara(aineistoNahtavilla: GenericAineisto[], kategoria: AineistoKategoria): number {
  const kategorianAineistojenMaara = aineistoNahtavilla.filter((aineisto) => aineisto.kategoriaId === kategoria.id).length;
  if (!(kategoria instanceof AineistoKategoria) || !kategoria.alaKategoriat || kategoria.alaKategoriat.length === 0) {
    return kategorianAineistojenMaara;
  } else {
    return kategoria.alaKategoriat.reduce((acc, kategoria) => {
      return acc + kategorianAllaOlevienAineistojenMaara(aineistoNahtavilla, kategoria);
    }, kategorianAineistojenMaara);
  }
}

export function getNestedAineistoMaaraForCategory(aineistot: GenericAineisto[] | null | undefined, kategoria: AineistoKategoria): number {
  let nestedAineistoMaaraSum = 0;
  if (aineistot) {
    const ids = getNestedCategoryIds([kategoria]);
    nestedAineistoMaaraSum += aineistot.filter(({ kategoriaId }) => kategoriaId && ids.includes(kategoriaId)).length;
  }
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
    return kategoriat.find(
      (kategoria) =>
        (aineistoKuvaus && isMatchingToHakulauseet(kategoria.hakulauseet, aineistoKuvaus)) ||
        (tiedostoNimi && isMatchingToHakulauseet(kategoria.hakulauseet, tiedostoNimi))
    );
  }
}

export const aineistoKategoriat = new AineistoKategoriat([
  {
    id: "osa_a",
    hakulauseet: [
      "100",
      "Osa A",
      "A Osa",
      // "(^|/)a($|/)" both conditions below must be met
      // -- be either at the start of string OR have a forward slash as a preceding character
      // -- be either at the end of string OR have a forward slash as a subsequent character
      "(^|/)a($|/)",
      "Kuulutus",
      "Selostus",
      "Sisällysluettelo",
    ],
    alakategoriat: [
      { id: "kaavakartat", hakulauseet: ["Kaava", "Kaavoitus", "1.7T", "119", "R120"] },
      {
        id: "suunnitteluprosessiin_liittyva_aineisto",
        hakulauseet: ["Suunnitteluprosessiin liittyvä aineisto", "Kuulutus", "Kutsu", "Esittely", "1.6T"],
      },
      {
        id: "yva",
        hakulauseet: [
          "Ympäristövaikutusten arviointi",
          "Päätelmä",
          // keyword 'yva' must be surrounded by non latin characters
          "(^|[^a-z])yva($|[^a-z])",
          "Yhteysviranomaisen perusteltu päätelmä",
          "120",
          "Kartta-atlas",
        ],
      },
    ],
  },
  {
    id: "osa_b",
    hakulauseet: [
      "200",
      "Osa B",
      "B Osa",
      // "(^|/)b($|/)" both conditions below must be met
      // -- be either at the start of string OR have a forward slash as a preceding character
      // -- be either at the end of string OR have a forward slash as a subsequent character
      "(^|/)b($|/)",
      "Pääpiirustus",
      "Pääpiirustukset",
    ],
    alakategoriat: [
      { id: "yleiskartat", hakulauseet: ["Yleiskartta", "Yleiskartat", "212", "2.1T"] },
      {
        id: "hallinnollisten_jarjestelyiden_kartat",
        hakulauseet: ["Hallinnollis", "213", "2.2T", "R224"],
      },
      { id: "suunnitelmakartat", hakulauseet: ["Suunnitelmakartat", "Suunnitelmakartta", "214", "3T", "R213"] },
      { id: "pituusleikkaukset", hakulauseet: ["Pituusleikkaukset", "Pituusleikkaus", "216", "5T", "R214"] },
      { id: "poikkileikkaukset", hakulauseet: ["Poikkileikkaus", "Poikkileikkaukset", "215", "4T"] },
      {
        id: "siltasuunnitelmat_ja_muut_taitorakenteet",
        hakulauseet: ["Silta", "Silto", "Silla", "15T", "Tunneli", "R217", "R218", "R219"],
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
          "222",
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
          "R216",
        ],
      },
      {
        id: "rataan_liittyvat_toimenpiteet_tiesuunnitelmassa",
        hakulauseet: [
          "Ratojen liittyvät toimenpiteet",
          "Radan liittyvät toimenpiteet",
          "Ratoihin liittyvät toimenpiteet",
          "Rataan liittyvät toimenpiteet",
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
          "R223",
        ],
      },
    ],
  },
  {
    id: "osa_c",
    hakulauseet: [
      "300",
      "Osa C",
      "C Osa",
      // "(^|/)c($|/)" both conditions below must be met
      // -- be either at the start of string OR have a forward slash as a preceding character
      // -- be either at the end of string OR have a forward slash as a subsequent character
      "(^|/)c($|/)",
      "Informatiivinen aineisto",
    ],
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
          "R313",
        ],
      },
      {
        id: "ulkopuoliset_rakenteet",
        hakulauseet: [
          // Hakutermit siirretty katusuunnitelmat kategoriaan
        ],
      },
      { id: "tutkitut_vaihtoehdot", hakulauseet: ["Tutkitut vaihtoehdot", "Tutkittu vaihtoehto", "340", "17T", "R315"] },
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
          "R310",
          // Hakutermit ulkopuoliset rakenteet kategoriasta
          "Ulkopuolisten raken",
          "Ulkopuolisen raken",
          "Ulkopuolisten omistamat raken",
          "Ulkopuolisen omistamat raken",
          "Ulkopuoliset raken",
          "Ulkopuolinen raken",
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
          "R312",
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
          "R311",
        ],
      },
      { id: "muut_selvitykset", hakulauseet: ["R314"] },
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
  { id: kategorisoimattomatId },
]);
