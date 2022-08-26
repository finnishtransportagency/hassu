import { Aineisto, AineistoInput } from "./graphql/apiModel";

export {};

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
    this.childKategoriat = props.alakategoriat?.map(
      (alakategoriaProps) => new AineistoKategoria(alakategoriaProps, this),
      this
    );
  }

  public get id() {
    return this.props.id;
  }

  public get parentKategoria() {
    return this.parent;
  }

  public get alaKategoriat() {
    return this.childKategoriat;
  }

  public get hakulauseet() {
    return this.props.hakulauseet;
  }
}

export class AineistoKategoriat {
  private readonly ylaKategoriat: AineistoKategoria[];

  constructor(aineistoKategoriat: AineistoKategoriaProps[]) {
    this.ylaKategoriat = aineistoKategoriat.map((kategoria) => new AineistoKategoria(kategoria));
  }

  public listKategoriat(): AineistoKategoria[] {
    return this.ylaKategoriat;
  }

  public listKategoriaIds(): string[] {
    return getNestedCategoryIds(this.ylaKategoriat);
  }

  public findKategoria(aineistoKuvaus: string, tiedostoNimi: string): AineistoKategoria | undefined {
    const ylakategoria = findMatchingCategory(this.ylaKategoriat, aineistoKuvaus);
    if (ylakategoria) {
      let alakategoria = findMatchingCategory(ylakategoria.alaKategoriat, aineistoKuvaus);
      if (alakategoria) {
        return alakategoria;
      }
      alakategoria = findMatchingCategory(ylakategoria.alaKategoriat, tiedostoNimi);
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
    if (kategoria.alaKategoriat) {
      kategoriaIds.push(...getNestedCategoryIds(kategoria.alaKategoriat));
    }
  });
  return kategoriaIds;
};

export function kategorianAllaOlevienAineistojenMaara(
  aineistoNahtavilla: Aineisto[],
  kategoria: AineistoKategoria
): number {
  const kategorianAineistojenMaara = aineistoNahtavilla.filter(
    (aineisto) => aineisto.kategoriaId === kategoria.id
  ).length;
  if (!kategoria.alaKategoriat || kategoria.alaKategoriat.length === 0) {
    return kategorianAineistojenMaara;
  } else {
    return kategoria.alaKategoriat.reduce((acc, kategoria) => {
      return acc + kategorianAllaOlevienAineistojenMaara(aineistoNahtavilla, kategoria);
    }, kategorianAineistojenMaara);
  }
}

export const getNestedAineistoMaaraForCategory = (
  aineistot: (Aineisto | AineistoInput)[],
  kategoria: AineistoKategoria
) => {
  let nestedAineistoMaaraSum = 0;
  const ids = getNestedCategoryIds([kategoria]);
  nestedAineistoMaaraSum += aineistot.filter(({ kategoriaId }) => kategoriaId && ids.includes(kategoriaId)).length;
  return nestedAineistoMaaraSum;
};

function isMatchingToHakulauseet(hakulauseet: string[] | undefined, keyword: string): boolean {
  const matchingHakulauseet = hakulauseet?.filter((hakulause) => {
    return !!keyword.match(hakulause);
  });
  return !!matchingHakulauseet && matchingHakulauseet.length > 0;
}

function findMatchingCategory(
  kategoriat: AineistoKategoria[] | undefined,
  keyword: string
): AineistoKategoria | undefined {
  if (!keyword) {
    return undefined;
  }
  if (kategoriat) {
    return kategoriat.filter((kategoria) => isMatchingToHakulauseet(kategoria.hakulauseet, keyword)).pop();
  }
}

export const aineistoKategoriat = new AineistoKategoriat([
  {
    id: "T1xx",
    hakulauseet: ["T1[0-9]{2}"],
    alakategoriat: [{ id: "TBD101", hakulauseet: ["T119"] }, { id: "TBD102" }, { id: "TBD103" }],
  },
  {
    id: "T2xx",
    hakulauseet: ["T2[0-9]{2}"],
    alakategoriat: [
      { id: "TBD201" },
      { id: "TBD202" },
      { id: "TBD203" },
      { id: "TBD204", hakulauseet: ["T216"] },
      { id: "TBD205" },
      { id: "TBD206" },
      { id: "TBD207" },
      { id: "TBD208" },
      { id: "TBD209" },
      { id: "TBD210" },
      { id: "TBD211" },
      { id: "TBD212" },
    ],
  },
  {
    id: "T3xx",
    hakulauseet: ["T3[0-9]{2}"],
    alakategoriat: [
      { id: "TBD301" },
      { id: "TBD302" },
      { id: "TBD303" },
      { id: "TBD304" },
      { id: "TBD305" },
      { id: "TBD306", hakulauseet: ["T320"] },
      { id: "TBD307" },
      { id: "TBD308" },
      { id: "TBD309" },
    ],
  },
]);
