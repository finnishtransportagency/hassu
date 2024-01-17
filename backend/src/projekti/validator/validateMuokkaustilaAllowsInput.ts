import { HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../database/model";
import { HyvaksymisPaatosVaiheInput, MuokkausTila, NahtavillaoloVaiheInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { adaptMuokkausTila } from "../projektiUtil";

export function validateMuokkaustilaAllowsInput(
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined,
  julkaisut: NahtavillaoloVaiheJulkaisu[] | HyvaksymisPaatosVaiheJulkaisu[] | null | undefined,
  input: NahtavillaoloVaiheInput | HyvaksymisPaatosVaiheInput | null | undefined
) {
  if (!vaihe || input === undefined) {
    return;
  }
  if (input === null) {
    throw new IllegalArgumentError("Et voi tyhjentää vaihetta kokonaan tällä toiminnolla.");
  }
  const muokkausTila = adaptMuokkausTila(vaihe, julkaisut);
  if (muokkausTila === MuokkausTila.LUKU) {
    throw new IllegalArgumentError("Vaihe, jota yrität muokata, on lukutilassa.");
  } else if (muokkausTila === MuokkausTila.MIGROITU) {
    throw new IllegalArgumentError("Adminin on avattava uudelleenkuulutus voidaksesi muokata migroitua vaihetta.");
  } else if (muokkausTila === MuokkausTila.AINEISTO_MUOKKAUS) {
    Object.keys(input).forEach((key) => {
      const allowedInputKeys: (keyof NahtavillaoloVaiheInput | keyof HyvaksymisPaatosVaiheInput)[] = ["aineistoNahtavilla"];
      if (!allowedInputKeys.includes(key as keyof NahtavillaoloVaiheInput | keyof HyvaksymisPaatosVaiheInput)) {
        throw new IllegalArgumentError(`Et voi muokata arvoa ${key}, koka projekti on aineistomuokkaustilassa`);
      }
    });
  }
}
