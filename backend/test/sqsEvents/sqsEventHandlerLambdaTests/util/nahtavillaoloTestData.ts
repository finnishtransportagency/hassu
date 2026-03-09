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
      uuid: "6067a56d-ecdf-4339-abdc-3859834dd077",
    },
  ],
};

export const hyvaksyttyNahtavillaoloJulkaisuAineistoA: NahtavillaoloVaiheJulkaisu = {
  projektiOid: "1",
  id: 1,
  aineistoNahtavilla: [
    {
      tila: API.AineistoTila.VALMIS,
      dokumenttiOid: "foo",
      nimi: "TiedostoA.txt",
      tiedosto: "/nahtavillaolo/1/AineistoA.txt",
      kategoriaId: "osa_a",
      uuid: "a6441ef2-0c50-4ece-9af3-1961615ba37b ",
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
  projektiOid: "1",
  aineistoNahtavilla: [
    {
      tila: API.AineistoTila.VALMIS,
      dokumenttiOid: "foo",
      nimi: "TiedostoB.txt",
      tiedosto: "/nahtavillaolo/2/AineistoB.txt",
      kategoriaId: "osa_a",
      uuid: "bb67ec10-c73b-491c-afb4-91ed47f56632",
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
