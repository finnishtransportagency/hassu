import { api } from "../api/apiClient";
import assert from "assert";
import { TallennaProjektiInput, UudelleenKuulutusInput } from "hassu-common/graphql/apiModel";

export async function uudelleenkuulutaAloitusKuulutus(oid: string, uudelleenKuulutusPaiva: string): Promise<void> {
  const projekti = await api.lataaProjekti(oid);
  assert(projekti.aloitusKuulutus?.uudelleenKuulutus);
  const uudelleenKuulutusInput: UudelleenKuulutusInput = {
    selosteKuulutukselle: {
      SUOMI: "Suomiseloste uudelleenkuulutukselle",
      RUOTSI: "Ruotsiseloste uudelleenkuulutukselle",
    },
    selosteLahetekirjeeseen: {
      SUOMI: "Suomiseloste uudelleenkuulutuksen lähetekirjeeseen",
      RUOTSI: "Ruotsiseloste uudelleenkuulutuksen lähetekirjeeseen",
    },
  };
  const { muokkausTila: _, aloituskuulutusSaamePDFt: _noNeedToSendThisFieldToAPI, ...rest } = projekti.aloitusKuulutus;
  const input: TallennaProjektiInput = {
    oid,
    versio: projekti.versio,
    aloitusKuulutus: {
      ...rest,
      kuulutusPaiva: uudelleenKuulutusPaiva,
      uudelleenKuulutus: uudelleenKuulutusInput,
    },
  };
  await api.tallennaProjekti(input);
}
