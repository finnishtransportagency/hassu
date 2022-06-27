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
      { id: "TBD11", nimi: "Kaavakartat", hakulauseet: ["T119"] },
      { id: "TBD12", nimi: "Suunnitteluprosessiin liittyvä aineisto" },
      { id: "TBD13", nimi: "YVA" },
    ],
  },
  {
    id: "T2xx",
    nimi: "Pääpiirustukset",
    hakulauseet: ["T2[0-9]{2}"],
    alakategoriat: [
      { id: "TBD21", nimi: "Yleiskartat" },
      { id: "TBD22", nimi: "Hallinnollisten järjestelyiden kartat" },
      { id: "TBD23", nimi: "Suunnitelmakartat" },
      { id: "TBD24", nimi: "Pituusleikkaukset", hakulauseet: ["T216"] },
      { id: "TBD25", nimi: "Poikkileikkaukset" },
      { id: "TBD26", nimi: "Siltasuunnitelmat ja muut taitorakenteet" },
      { id: "TBD27", nimi: "Ympäristörakenteet, esim. meluesteet" },
      { id: "TBD28", nimi: "Lunastuskartat" },
      { id: "TBD29", nimi: "Liikennepaikkojen suunnitelmat" },
      { id: "TBD30", nimi: "Maanteiden toimenpiteet ratasuunnitelmassa" },
      { id: "TBD31", nimi: "Ratojen toimenpiteet tiesuunnitelmassa" },
      { id: "TBD32", nimi: "Muut piirustukset ja kuvat" },
    ],
  },
  {
    id: "T3xx",
    nimi: "Informatiivinen aineisto",
    hakulauseet: ["T3[0-9]{2}"],
    alakategoriat: [
      { id: "TBD31", nimi: "Vaikutuksia kuvaavat selvitykset" },
      { id: "TBD32", nimi: "Ulkopuoliset rakenteet" },
      { id: "TBD33", nimi: "Tutkitut vaihtoehdot" },
      { id: "TBD34", nimi: "Katusuunnitelmat" },
      { id: "TBD35", nimi: "Visualisointikuvat" },
      { id: "TBD36", nimi: "Ympäristösuunnitelmat", hakulauseet: ["T320"] },
      { id: "TBD37", nimi: "Muut selvitykset" },
      { id: "TBD38", nimi: "Valaistuksen ja liikenteenohjauksen yleiskartat" },
      { id: "TBD39", nimi: "Johtosiirrot ja kunnallistekniset suunnitelmat" },
    ],
  },
]);
