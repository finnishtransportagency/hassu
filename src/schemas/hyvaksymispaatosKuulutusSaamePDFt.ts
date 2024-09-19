import * as Yup from "yup";
import { kuulutusSaamePDFtInput } from "./kuulutusSaamePDFtInput";
export const hyvaksymispaatosKuulutusSaamePDFtSchema = Yup.object().shape({
  hyvaksymisPaatosVaihe: Yup.object()
    .required()
    .shape({
      hyvaksymisPaatosVaiheSaamePDFt: kuulutusSaamePDFtInput(true),
    }),
});
