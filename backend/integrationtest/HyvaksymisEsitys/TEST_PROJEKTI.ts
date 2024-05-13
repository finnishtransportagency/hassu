import { AloitusKuulutusJulkaisu, DBProjekti, NahtavillaoloVaiheJulkaisu, VuorovaikutusKierrosJulkaisu } from "../../src/database/model";
import * as API from "hassu-common/graphql/apiModel";

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

const TEST_ALOITUSKUULUTUS_JULKAISU: DeepPartial<AloitusKuulutusJulkaisu> = {
  id: 1,
  aloituskuulutusPDFt: {
    SUOMI: {
      aloituskuulutusIlmoitusPDFPath: "/aloituskuulutus/1/T412_1 Ilmoitus aloituskuulutuksesta.pdf",
      aloituskuulutusPDFPath: "/aloituskuulutus/1/T412 Aloituskuulutus.pdf",
    },
    RUOTSI: {
      aloituskuulutusIlmoitusPDFPath: "/aloituskuulutus/1/T412_1 Ilmoitus aloituskuulutuksesta sv.pdf",
      aloituskuulutusPDFPath: "/aloituskuulutus/1/T412 Aloituskuulutus sv.pdf",
    },
  },
  aloituskuulutusSaamePDFt: {
    POHJOISSAAME: {
      kuulutusPDF: {
        tiedosto: "/aloituskuulutus/1/T412 Aloituskuulutus se.pdf",
        nimi: "T412 Aloituskuulutus se.pdf",
        tuotu: "2011-01-01T01:01",
      },
      kuulutusIlmoitusPDF: {
        tiedosto: "/aloituskuulutus/1/T412_1 Ilmoitus aloituskuulutuksesta se.pdf",
        nimi: "T412_1 Ilmoitus aloituskuulutuksesta se.pdf",
        tuotu: "2011-01-01T01:01",
      },
    },
  },
  lahetekirje: {
    tiedosto: "/aloituskuulutus/1/lähetekirje.eml",
    nimi: "lähetekirje.eml",
  },
};

const TEST_VUOROVAIKUTUS_KIERROS_JULKAISU: DeepPartial<VuorovaikutusKierrosJulkaisu> = getTestVuorovaikutusKierrosJulkaisu();
const TEST_VUOROVAIKUTUS_KIERROS_JULKAISU2: DeepPartial<VuorovaikutusKierrosJulkaisu> = getTestVuorovaikutusKierrosJulkaisu(2);

function getTestVuorovaikutusKierrosJulkaisu(number: number = 1) {
  return {
    id: number,
    aineistot: [
      {
        tiedosto: `/suunnitteluvaihe/vuorovaikutus_${number}/vuorovaikutusaineisto äöå ${number} 1.png`,
        nimi: `vuorovaikutusaineisto äöå ${number} 1.png`,
        tila: API.AineistoTila.VALMIS,
      },
      {
        tiedosto: `/suunnitteluvaihe/vuorovaikutus_${number}/vuorovaikutusaineisto äöå ${number} 2.png`,
        nimi: `vuorovaikutusaineisto äöå ${number} 2.png`,
        tila: API.AineistoTila.VALMIS,
      },
    ],
    vuorovaikutusPDFt: {
      SUOMI: {
        kutsuPDFPath: `suunnitteluvaihe/vuorovaikutus_${number}/T413 Kutsu vuorovaikutukseen.pdf`,
      },
      RUOTSI: {
        kutsuPDFPath: `suunnitteluvaihe/vuorovaikutus_${number}/T413 Kutsu vuorovaikutukseen sv.pdf`,
      },
    },
    vuorovaikutusSaamePDFt: {
      POHJOISSAAME: {
        tiedosto: `suunnitteluvaihe/vuorovaikutus_${number}/T413 Kutsu vuorovaikutukseen se.pdf`,
        nimi: "T413 Kutsu vuorovaikutukseen se.pdf",
        tuotu: "2011-01-01T01:01",
      },
    },
    lahetekirje: {
      tiedosto: `suunnitteluvaihe/vuorovaikutus_${number}/lähetekirje.eml`,
      nimi: "lähetekirje.eml",
    },
  };
}
const TEST_NAHTAVILLAOLOVAIHE_JULKAISU: DeepPartial<NahtavillaoloVaiheJulkaisu> = {
  id: 1,
  aineistoNahtavilla: [
    {
      tiedosto: "/nahtavillaolo/1/nähtävilläoloaineisto äöå 1.png",
      nimi: "nähtävilläoloaineisto äöå 1.png",
      tila: API.AineistoTila.VALMIS,
    },
    {
      tiedosto: "/nahtavillaolo/1/nähtävilläoloaineisto äöå 2.png",
      nimi: "nähtävilläoloaineisto äöå 2.png",
      tila: API.AineistoTila.VALMIS,
    },
  ],
  nahtavillaoloSaamePDFt: {
    POHJOISSAAME: {
      kuulutusPDF: {
        tiedosto: "/nahtavillaolo/1/T414 Kuulutus suunnitelman nähtävilläolo se.pdf",
        nimi: "T414 Kuulutus suunnitelman nähtävilläolo se.pdf",
        tuotu: "2011-01-01T01:01",
      },
      kuulutusIlmoitusPDF: {
        tiedosto: "/nahtavillaolo/1/T414_1 Ilmoitus suunnitelman nähtävilläolo se.pdf",
        nimi: "T414_1 Ilmoitus suunnitelman nähtävilläolo se.pdf",
        tuotu: "2011-01-01T01:01",
      },
    },
  },
  nahtavillaoloPDFt: {
    SUOMI: {
      nahtavillaoloPDFPath: "/nahtavillaolo/1/T414 Kuulutus suunnitelman nähtävilläolo.pdf",
      nahtavillaoloIlmoitusPDFPath: "/nahtavillaolo/1/T414_1 Ilmoitus suunnitelman nähtävilläolo.pdf",
    },
    RUOTSI: {
      nahtavillaoloPDFPath: "/nahtavillaolo/1/T414 Kuulutus suunnitelman nähtävilläolo sv.pdf",
      nahtavillaoloIlmoitusPDFPath: "/nahtavillaolo/1/T414_1 Ilmoitus suunnitelman nähtävilläolo sv.pdf",
    },
  },
  lahetekirje: {
    tiedosto: "/nahtavillaolo/1/lähetekirje.eml",
    nimi: "lähetekirje.eml",
  },
};

/**
 * Testidataa hyväksymisesityksen tiedostojen latausta ja esikatselua varten
 */

export const TEST_PROJEKTI: Pick<DBProjekti, "oid"> & DeepPartial<DBProjekti> = {
  oid: "Testi1",
  versio: 1,
  aloitusKuulutusJulkaisut: [TEST_ALOITUSKUULUTUS_JULKAISU],
  vuorovaikutusKierrosJulkaisut: [TEST_VUOROVAIKUTUS_KIERROS_JULKAISU, TEST_VUOROVAIKUTUS_KIERROS_JULKAISU2],
  nahtavillaoloVaiheJulkaisut: [TEST_NAHTAVILLAOLOVAIHE_JULKAISU],
  salt: "salt",
};

export const TEST_PROJEKTI_FILES: { tiedosto: string; nimi: string }[] = [
  { tiedosto: "/aloituskuulutus/1/T412_1 Ilmoitus aloituskuulutuksesta.pdf", nimi: "T412_1 Ilmoitus aloituskuulutuksesta.pdf" },
  { tiedosto: "/aloituskuulutus/1/T412 Aloituskuulutus.pdf", nimi: "T412 Aloituskuulutus.pdf" },
  { tiedosto: "/aloituskuulutus/1/T412_1 Ilmoitus aloituskuulutuksesta sv.pdf", nimi: "T412_1 Ilmoitus aloituskuulutuksesta sv.pdf" },
  { tiedosto: "/aloituskuulutus/1/T412 Aloituskuulutus sv.pdf", nimi: "T412 Aloituskuulutus sv.pdf" },
  { tiedosto: "/aloituskuulutus/1/T412_1 Ilmoitus aloituskuulutuksesta se.pdf", nimi: "T412_1 Ilmoitus aloituskuulutuksesta se.pdf" },
  { tiedosto: "/aloituskuulutus/1/T412 Aloituskuulutus se.pdf", nimi: "T412 Aloituskuulutus se.pdf" },
  { tiedosto: "/aloituskuulutus/1/lähetekirje.eml", nimi: "lähetekirje.eml" },
  { tiedosto: "/suunnitteluvaihe/vuorovaikutus_1/vuorovaikutusaineisto äöå 1 1.png", nimi: "vuorovaikutusaineisto äöå 1 1.png" },
  { tiedosto: "/suunnitteluvaihe/vuorovaikutus_1/vuorovaikutusaineisto äöå 1 2.png", nimi: "vuorovaikutusaineisto äöå 1 2.png" },
  { tiedosto: "/suunnitteluvaihe/vuorovaikutus_1/T413 Kutsu vuorovaikutukseen.pdf", nimi: "T413 Kutsu vuorovaikutukseen.pdf" },
  { tiedosto: "/suunnitteluvaihe/vuorovaikutus_1/T413 Kutsu vuorovaikutukseen sv.pdf", nimi: "T413 Kutsu vuorovaikutukseen sv.pdf" },
  { tiedosto: "/suunnitteluvaihe/vuorovaikutus_1/T413 Kutsu vuorovaikutukseen se.pdf", nimi: "T413 Kutsu vuorovaikutukseen se.pdf" },
  { tiedosto: "/suunnitteluvaihe/vuorovaikutus_1/lähetekirje.eml", nimi: "lähetekirje.eml" },
  { tiedosto: "/suunnitteluvaihe/vuorovaikutus_2/vuorovaikutusaineisto äöå 2 1.png", nimi: "vuorovaikutusaineisto äöå 2 1.png" },
  { tiedosto: "/suunnitteluvaihe/vuorovaikutus_2/vuorovaikutusaineisto äöå 2 2.png", nimi: "vuorovaikutusaineisto äöå 2 2.png" },
  { tiedosto: "/suunnitteluvaihe/vuorovaikutus_2/T413 Kutsu vuorovaikutukseen.pdf", nimi: "T413 Kutsu vuorovaikutukseen.pdf" },
  { tiedosto: "/suunnitteluvaihe/vuorovaikutus_2/T413 Kutsu vuorovaikutukseen sv.pdf", nimi: "T413 Kutsu vuorovaikutukseen sv.pdf" },
  { tiedosto: "/suunnitteluvaihe/vuorovaikutus_2/T413 Kutsu vuorovaikutukseen se.pdf", nimi: "T413 Kutsu vuorovaikutukseen se.pdf" },
  { tiedosto: "/suunnitteluvaihe/vuorovaikutus_2/lähetekirje.eml", nimi: "lähetekirje.eml" },
  { tiedosto: "/nahtavillaolo/1/nähtävilläoloaineisto äöå 1.png", nimi: "nähtävilläoloaineisto äöå 1.png" },
  { tiedosto: "/nahtavillaolo/1/nähtävilläoloaineisto äöå 2.png", nimi: "nähtävilläoloaineisto äöå 2.png" },
  { tiedosto: "/nahtavillaolo/1/T414 Kuulutus suunnitelman nähtävilläolo se.pdf", nimi: "T414 Kuulutus suunnitelman nähtävilläolo se.pdf" },
  {
    tiedosto: "/nahtavillaolo/1/T414_1 Ilmoitus suunnitelman nähtävilläolo se.pdf",
    nimi: "T414_1 Ilmoitus suunnitelman nähtävilläolo se.pdf",
  },
  { tiedosto: "/nahtavillaolo/1/T414 Kuulutus suunnitelman nähtävilläolo.pdf", nimi: "T414 Kuulutus suunnitelman nähtävilläolo.pdf" },
  { tiedosto: "/nahtavillaolo/1/T414_1 Ilmoitus suunnitelman nähtävilläolo.pdf", nimi: "T414_1 Ilmoitus suunnitelman nähtävilläolo.pdf" },

  { tiedosto: "/nahtavillaolo/1/T414 Kuulutus suunnitelman nähtävilläolo sv.pdf", nimi: "T414 Kuulutus suunnitelman nähtävilläolo sv.pdf" },
  {
    tiedosto: "/nahtavillaolo/1/T414_1 Ilmoitus suunnitelman nähtävilläolo sv.pdf",
    nimi: "T414_1 Ilmoitus suunnitelman nähtävilläolo sv.pdf",
  },
  { tiedosto: "/nahtavillaolo/1/lähetekirje.eml", nimi: "lähetekirje.eml" },
];