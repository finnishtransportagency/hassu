import { NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../../../src/database/model";
import * as API from "hassu-common/graphql/apiModel";

export const nahtavillaoloVaiheAineistoC: NahtavillaoloVaihe = {
  id: 2,
  aineistoNahtavilla: [
    {
      tila: API.AineistoTila.VALMIS,
      dokumenttiOid: "foo",
      nimi: "TiedostoC.txt",
      tiedosto: "/nahtavillaolo/2/AineistoC.txt",
      kategoriaId: "osa_a",
    },
  ],
};

export const hyvaksyttyNahtavillaoloJulkaisuAineistoA: NahtavillaoloVaiheJulkaisu = {
  id: 1,
  aineistoNahtavilla: [
    {
      tila: API.AineistoTila.VALMIS,
      dokumenttiOid: "foo",
      nimi: "TiedostoA.txt",
      tiedosto: "/nahtavillaolo/1/AineistoA.txt",
      kategoriaId: "osa_a",
    },
  ],
  tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
  velho: { nimi: "Projekti 1" },
  kielitiedot: { ensisijainenKieli: API.Kieli.SUOMI },
  yhteystiedot: [],
  kuulutusYhteystiedot: {},
  ilmoituksenVastaanottajat: {},
  hankkeenKuvaus: { SUOMI: "" },
};

export const hyvaksymatonNahtavillaoloJulkaisuAineistoB: NahtavillaoloVaiheJulkaisu = {
  id: 2,
  aineistoNahtavilla: [
    {
      tila: API.AineistoTila.VALMIS,
      dokumenttiOid: "foo",
      nimi: "TiedostoB.txt",
      tiedosto: "/nahtavillaolo/2/AineistoB.txt",
      kategoriaId: "osa_a",
    },
  ],
  tila: API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
  velho: { nimi: "Projekti 1" },
  kielitiedot: { ensisijainenKieli: API.Kieli.SUOMI },
  yhteystiedot: [],
  kuulutusYhteystiedot: {},
  ilmoituksenVastaanottajat: {},
  hankkeenKuvaus: { SUOMI: "" },
};
