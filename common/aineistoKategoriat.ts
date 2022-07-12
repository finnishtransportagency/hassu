export {};

type AineistoKategoriaProps = {
  id: string;
  nimi: string;
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

  public get nimi() {
    return this.props.nimi;
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
    nimi: "Selostusosa",
    hakulauseet: ["T1[0-9]{2}"],
    alakategoriat: [
      { id: "TBD101", nimi: "Kaavakartat", hakulauseet: ["T119"] },
      { id: "TBD102", nimi: "Suunnitteluprosessiin liittyvä aineisto" },
      { id: "TBD103", nimi: "YVA" },
    ],
  },
  {
    id: "T2xx",
    nimi: "Pääpiirustukset",
    hakulauseet: ["T2[0-9]{2}"],
    alakategoriat: [
      { id: "TBD201", nimi: "Yleiskartat" },
      { id: "TBD202", nimi: "Hallinnollisten järjestelyiden kartat" },
      { id: "TBD203", nimi: "Suunnitelmakartat" },
      { id: "TBD204", nimi: "Pituusleikkaukset", hakulauseet: ["T216"] },
      { id: "TBD205", nimi: "Poikkileikkaukset" },
      { id: "TBD206", nimi: "Siltasuunnitelmat ja muut taitorakenteet" },
      { id: "TBD207", nimi: "Ympäristörakenteet, esim. meluesteet" },
      { id: "TBD208", nimi: "Lunastuskartat" },
      { id: "TBD209", nimi: "Liikennepaikkojen suunnitelmat" },
      { id: "TBD210", nimi: "Maanteiden toimenpiteet ratasuunnitelmassa" },
      { id: "TBD211", nimi: "Ratojen toimenpiteet tiesuunnitelmassa" },
      { id: "TBD212", nimi: "Muut piirustukset ja kuvat" },
    ],
  },
  {
    id: "T3xx",
    nimi: "Informatiivinen aineisto",
    hakulauseet: ["T3[0-9]{2}"],
    alakategoriat: [
      { id: "TBD301", nimi: "Vaikutuksia kuvaavat selvitykset" },
      { id: "TBD302", nimi: "Ulkopuoliset rakenteet" },
      { id: "TBD303", nimi: "Tutkitut vaihtoehdot" },
      { id: "TBD304", nimi: "Katusuunnitelmat" },
      { id: "TBD305", nimi: "Visualisointikuvat" },
      { id: "TBD306", nimi: "Ympäristösuunnitelmat", hakulauseet: ["T320"] },
      { id: "TBD307", nimi: "Muut selvitykset" },
      { id: "TBD308", nimi: "Valaistuksen ja liikenteenohjauksen yleiskartat" },
      { id: "TBD309", nimi: "Johtosiirrot ja kunnallistekniset suunnitelmat" },
    ],
  },
]);
