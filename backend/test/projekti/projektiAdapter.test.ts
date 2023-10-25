import { describe, it } from "mocha";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { projektiAdapter } from "../../src/projekti/adapter/projektiAdapter";
import * as sinon from "sinon";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";

import { expect } from "chai";
import { AineistoTila, TallennaProjektiInput } from "hassu-common/graphql/apiModel";

describe("projektiAdapter", () => {
  let fixture: ProjektiFixture;

  let getKayttajasStub: sinon.SinonStub;

  before(() => {
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
  });

  beforeEach(() => {
    fixture = new ProjektiFixture();
    const personSearchFixture = new PersonSearchFixture();
    getKayttajasStub.resolves(
      Kayttajas.fromKayttajaList([
        personSearchFixture.pekkaProjari,
        personSearchFixture.mattiMeikalainen,
        personSearchFixture.manuMuokkaaja,
      ])
    );
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("should allow nullifying arvioSeuraavanVaiheenAlkamisesta in vuorovaikutusKierros", async () => {
    const projekti = fixture.dbProjekti1();
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 0,
      arvioSeuraavanVaiheenAlkamisesta: {
        SUOMI: "asdf",
        RUOTSI: "RUOTSIKSI asdf",
      },
    };

    const result = await projektiAdapter.adaptProjektiToSave(projekti, {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        arvioSeuraavanVaiheenAlkamisesta: null,
      },
    });
    expect(result.projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta).to.be.eql(null);
  });

  it("should be able to create one lausuntoPyynto for project", async () => {
    const dbProjekti = new ProjektiFixture().nahtavillaoloVaihe();
    delete dbProjekti.nahtavillaoloVaiheJulkaisut;
    const input: TallennaProjektiInput = {
      oid: dbProjekti.oid,
      versio: dbProjekti.versio,
      lausuntoPyynnot: [
        {
          id: 1,
          poistumisPaiva: "2022-06-07",
          lisaAineistot: [
            {
              dokumenttiOid: "1",
              nimi: "Example 1",
              jarjestys: 1,
            },
          ],
          muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
        },
      ],
    };
    const result = await projektiAdapter.adaptProjektiToSave(dbProjekti, input);
    expect(result.projekti.lausuntoPyynnot).to.eql([
      {
        id: 1,
        poistumisPaiva: "2022-06-07",
        lisaAineistot: [
          {
            dokumenttiOid: "1",
            nimi: "Example 1",
            tila: AineistoTila.ODOTTAA_TUONTIA,
            kategoriaId: undefined,
            jarjestys: 1,
          },
        ],
        muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
      },
    ]);
    (Object.keys(result.projekti) as (keyof typeof result.projekti)[])
      .filter((key) => !["oid", "versio", "lausuntoPyynnot", "kayttoOikeudet", "salt"].includes(key))
      .forEach((key) => {
        expect(result.projekti[key]).to.eql(undefined);
      });
  });

  it("should be able to add more lisaAineistot to a specific lausuntoPyynto", async () => {
    const dbProjekti = new ProjektiFixture().nahtavillaoloVaihe();
    delete dbProjekti.nahtavillaoloVaiheJulkaisut;
    dbProjekti.lausuntoPyynnot = [
      {
        id: 1,
        poistumisPaiva: "2022-06-07",
        lisaAineistot: [
          {
            dokumenttiOid: "1",
            nimi: "Example 1",
            tila: AineistoTila.VALMIS,
            kategoriaId: undefined,
            jarjestys: 1,
          },
        ],
        muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
      },
    ];
    const input: TallennaProjektiInput = {
      oid: dbProjekti.oid,
      versio: dbProjekti.versio,
      lausuntoPyynnot: [
        {
          id: 1,
          poistumisPaiva: "2022-06-07",
          lisaAineistot: [
            {
              dokumenttiOid: "1",
              nimi: "Example 1",
              tila: AineistoTila.VALMIS,
              jarjestys: 1,
            },
            {
              dokumenttiOid: "2",
              nimi: "Example 2",
              jarjestys: 2,
            },
          ],
          muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
        },
      ],
    };
    const result = await projektiAdapter.adaptProjektiToSave(dbProjekti, input);
    expect(result.projekti.lausuntoPyynnot).to.eql([
      {
        id: 1,
        poistumisPaiva: "2022-06-07",
        lisaAineistot: [
          {
            dokumenttiOid: "1",
            nimi: "Example 1",
            tila: AineistoTila.VALMIS,
            kategoriaId: undefined,
            jarjestys: 1,
          },
          {
            dokumenttiOid: "2",
            nimi: "Example 2",
            tila: AineistoTila.ODOTTAA_TUONTIA,
            kategoriaId: undefined,
            jarjestys: 2,
          },
        ],
        muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
      },
    ]);
    (Object.keys(result.projekti) as (keyof typeof result.projekti)[])
      .filter((key) => !["oid", "versio", "lausuntoPyynnot", "kayttoOikeudet", "salt"].includes(key))
      .forEach((key) => {
        expect(result.projekti[key]).to.eql(undefined);
      });
  });

  it("should be able to add a second lausuntoPyynto", async () => {
    const dbProjekti = new ProjektiFixture().nahtavillaoloVaihe();
    delete dbProjekti.nahtavillaoloVaiheJulkaisut;
    dbProjekti.lausuntoPyynnot = [
      {
        id: 1,
        poistumisPaiva: "2022-06-07",
        lisaAineistot: [
          {
            dokumenttiOid: "1",
            nimi: "Example 1",
            tila: AineistoTila.VALMIS,
            kategoriaId: undefined,
            jarjestys: 1,
          },
        ],
        muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
      },
    ];
    const input: TallennaProjektiInput = {
      oid: dbProjekti.oid,
      versio: dbProjekti.versio,
      lausuntoPyynnot: [
        {
          id: 1,
          poistumisPaiva: "2022-06-07",
          lisaAineistot: [
            {
              dokumenttiOid: "1",
              nimi: "Example 1",
              tila: AineistoTila.VALMIS,
              jarjestys: 1,
            },
          ],
          muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
        },
        {
          id: 2,
          poistumisPaiva: "2022-06-07",
          lisaAineistot: [
            {
              dokumenttiOid: "B1",
              nimi: "Example B1",
              jarjestys: 1,
            },
          ],
          muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle Y.",
        },
      ],
    };
    const result = await projektiAdapter.adaptProjektiToSave(dbProjekti, input);
    expect(result.projekti.lausuntoPyynnot).to.eql([
      {
        id: 1,
        poistumisPaiva: "2022-06-07",
        lisaAineistot: [
          {
            dokumenttiOid: "1",
            nimi: "Example 1",
            tila: AineistoTila.VALMIS,
            kategoriaId: undefined,
            jarjestys: 1,
          },
        ],
        muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
      },
      {
        id: 2,
        poistumisPaiva: "2022-06-07",
        lisaAineistot: [
          {
            dokumenttiOid: "B1",
            nimi: "Example B1",
            tila: AineistoTila.ODOTTAA_TUONTIA,
            kategoriaId: undefined,
            jarjestys: 1,
          },
        ],
        muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle Y.",
      },
    ]);
    (Object.keys(result.projekti) as (keyof typeof result.projekti)[])
      .filter((key) => !["oid", "versio", "lausuntoPyynnot", "kayttoOikeudet", "salt"].includes(key))
      .forEach((key) => {
        expect(result.projekti[key]).to.eql(undefined);
      });
  });

  it("should be able to remove lisaAineisto from lausuntoPyynto", async () => {
    const dbProjekti = new ProjektiFixture().nahtavillaoloVaihe();
    delete dbProjekti.nahtavillaoloVaiheJulkaisut;
    dbProjekti.lausuntoPyynnot = [
      {
        id: 1,
        poistumisPaiva: "2022-06-07",
        lisaAineistot: [
          {
            dokumenttiOid: "1",
            nimi: "Example 1",
            tila: AineistoTila.VALMIS,
            kategoriaId: undefined,
            jarjestys: 1,
          },
        ],
        muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
      },
    ];
    const input: TallennaProjektiInput = {
      oid: dbProjekti.oid,
      versio: dbProjekti.versio,
      lausuntoPyynnot: [
        {
          id: 1,
          poistumisPaiva: "2022-06-07",
          lisaAineistot: [
            {
              dokumenttiOid: "1",
              nimi: "Example 1",
              tila: AineistoTila.ODOTTAA_POISTOA,
              jarjestys: 1,
            },
          ],
          muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
        },
      ],
    };
    const result = await projektiAdapter.adaptProjektiToSave(dbProjekti, input);
    expect(result.projekti.lausuntoPyynnot).to.eql([
      {
        id: 1,
        poistumisPaiva: "2022-06-07",
        lisaAineistot: [
          {
            dokumenttiOid: "1",
            nimi: "Example 1",
            tila: AineistoTila.ODOTTAA_POISTOA,
            kategoriaId: undefined,
            jarjestys: 1,
          },
        ],
        muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
      },
    ]);
    (Object.keys(result.projekti) as (keyof typeof result.projekti)[])
      .filter((key) => !["oid", "versio", "lausuntoPyynnot", "kayttoOikeudet", "salt"].includes(key))
      .forEach((key) => {
        expect(result.projekti[key]).to.eql(undefined);
      });
  });

  it("should be able to remove a lausuntoPyynto", async () => {
    const dbProjekti = new ProjektiFixture().nahtavillaoloVaihe();
    delete dbProjekti.nahtavillaoloVaiheJulkaisut;
    dbProjekti.lausuntoPyynnot = [
      {
        id: 1,
        poistumisPaiva: "2022-06-07",
        lisaAineistot: [
          {
            dokumenttiOid: "1",
            nimi: "Example 1",
            tila: AineistoTila.VALMIS,
            kategoriaId: undefined,
            jarjestys: 1,
          },
        ],
        muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
      },
      {
        id: 2,
        poistumisPaiva: "2022-06-07",
        lisaAineistot: [
          {
            dokumenttiOid: "B1",
            nimi: "Example B1",
            tila: AineistoTila.VALMIS,
            kategoriaId: undefined,
            jarjestys: 1,
          },
        ],
        muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle Y.",
      },
    ];
    const input: TallennaProjektiInput = {
      oid: dbProjekti.oid,
      versio: dbProjekti.versio,
      lausuntoPyynnot: [
        {
          id: 1,
          poistumisPaiva: "2022-06-07",
          lisaAineistot: [
            {
              dokumenttiOid: "1",
              nimi: "Example 1",
              tila: AineistoTila.VALMIS,
              jarjestys: 1,
            },
          ],
          muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
        },
      ],
    };
    const result = await projektiAdapter.adaptProjektiToSave(dbProjekti, input);
    expect(result.projekti.lausuntoPyynnot).to.eql([
      {
        id: 1,
        poistumisPaiva: "2022-06-07",
        lisaAineistot: [
          {
            dokumenttiOid: "1",
            nimi: "Example 1",
            tila: AineistoTila.VALMIS,
            kategoriaId: undefined,
            jarjestys: 1,
          },
        ],
        muistiinpano: "Tämä lausuntopyyntö on tarkoitus lähettää vastaanottajalle X.",
      },
    ]);
    (Object.keys(result.projekti) as (keyof typeof result.projekti)[])
      .filter((key) => !["oid", "versio", "lausuntoPyynnot", "kayttoOikeudet", "salt"].includes(key))
      .forEach((key) => {
        expect(result.projekti[key]).to.eql(undefined);
      });

    //TODO: testaa että poistetun lausuntopyynnön aineistot oikeasti poistetaan jollain mekanismilla
  });
});
