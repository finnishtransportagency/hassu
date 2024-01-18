import { DBProjekti, UudelleenKuulutus } from "../../database/model";
import { TallennaProjektiInput, UudelleenKuulutusInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";

type UudelleenKuulutusTuple = [UudelleenKuulutus | null | undefined, UudelleenKuulutusInput | null | undefined];

/**
 * Validoi, että jos yritetään tallentaa uudelleenkuulutusta, sellainen on olemassa
 */
export function validateUudelleenKuulutus(projekti: DBProjekti, input: TallennaProjektiInput) {
  const uudelleenKuulutusTuples: UudelleenKuulutusTuple[] = [
    [projekti.aloitusKuulutus?.uudelleenKuulutus, input.aloitusKuulutus?.uudelleenKuulutus],
    [projekti.nahtavillaoloVaihe?.uudelleenKuulutus, input.nahtavillaoloVaihe?.uudelleenKuulutus],
    [projekti.hyvaksymisPaatosVaihe?.uudelleenKuulutus, input.hyvaksymisPaatosVaihe?.uudelleenKuulutus],
    [projekti.jatkoPaatos1Vaihe?.uudelleenKuulutus, input.jatkoPaatos1Vaihe?.uudelleenKuulutus],
    [projekti.jatkoPaatos2Vaihe?.uudelleenKuulutus, input.jatkoPaatos2Vaihe?.uudelleenKuulutus],
  ];
  uudelleenKuulutusTuples.forEach(([uudelleenKuulutus, uudelleenKuulutusInput]) => {
    if (uudelleenKuulutusInput && !uudelleenKuulutus) {
      throw new IllegalArgumentError("Uudelleenkuulutuksen tietoja ei voi tallentaa jos uudelleenkuulutusta ei ole vielä avattu");
    }
  });
}
