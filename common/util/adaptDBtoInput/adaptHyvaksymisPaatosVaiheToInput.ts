import { HyvaksymisPaatosVaihe } from "../../../backend/src/database/model";
import * as API from "../../graphql/apiModel";
import { adaptAineistoToInput, adaptKuntaVastaanottajaToInput, adaptViranomaisVastaanottajaToInput } from ".";
export function adaptHyvaksymisPaatosVaiheToInput(hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe): API.HyvaksymisPaatosVaiheInput {
  return {
    aineistoNahtavilla: hyvaksymisPaatosVaihe?.aineistoNahtavilla?.map(adaptAineistoToInput),
    hyvaksymisPaatos: hyvaksymisPaatosVaihe?.hyvaksymisPaatos?.map(adaptAineistoToInput),
    kuulutusPaiva: hyvaksymisPaatosVaihe.kuulutusPaiva,
    hyvaksymisPaatosVaiheSaamePDFt: {
      POHJOISSAAME: {
        kuulutusIlmoitusPDFPath: hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusIlmoitusPDF?.tiedosto,
        kuulutusPDFPath: hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusPDF?.tiedosto,
      },
    },
    hallintoOikeus: hyvaksymisPaatosVaihe.hallintoOikeus,
    kuulutusYhteystiedot: hyvaksymisPaatosVaihe.kuulutusYhteystiedot,
    ilmoituksenVastaanottajat: {
      kunnat: hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat?.kunnat?.map(adaptKuntaVastaanottajaToInput),
      viranomaiset: hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat?.viranomaiset?.map(adaptViranomaisVastaanottajaToInput),
    },
    viimeinenVoimassaolovuosi: hyvaksymisPaatosVaihe.viimeinenVoimassaolovuosi,
    uudelleenKuulutus: {
      selosteKuulutukselle: hyvaksymisPaatosVaihe.uudelleenKuulutus?.selosteKuulutukselle,
      selosteLahetekirjeeseen: hyvaksymisPaatosVaihe.uudelleenKuulutus?.selosteLahetekirjeeseen,
    },
  };
}
