import { paatosKuulutusSchema } from "./paatosKuulutusYhteiset";
import { PaatosTyyppi } from "../util/getPaatosSpecificData";
import { hyvaksymispaatosKuulutusSaamePDFtSchema } from "./hyvaksymispaatosKuulutusSaamePDFt";
import { jatkopaatos1KuulutusSaamePDFtSchema } from "./jatkopaatos1KuulutusSaamePDFt";
import { jatkopaatos2KuulutusSaamePDFtSchema } from "./jatkopaatos2KuulutusSaamePDFt";

function paatosSaamePDFSchema(paatosTyyppi: PaatosTyyppi) {
  switch (paatosTyyppi) {
    case PaatosTyyppi.HYVAKSYMISPAATOS:
      return hyvaksymispaatosKuulutusSaamePDFtSchema;
    case PaatosTyyppi.JATKOPAATOS1:
      return jatkopaatos1KuulutusSaamePDFtSchema;
    case PaatosTyyppi.JATKOPAATOS2:
      return jatkopaatos2KuulutusSaamePDFtSchema;
  }
}

export function createPaatosKuulutusSchema(paatosTyyppi: PaatosTyyppi) {
  return paatosKuulutusSchema.concat(paatosSaamePDFSchema(paatosTyyppi));
}
