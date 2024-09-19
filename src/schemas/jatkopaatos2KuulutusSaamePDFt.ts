import * as Yup from "yup";
import { kuulutusSaamePDFtInput } from "./kuulutusSaamePDFtInput";
export const jatkopaatos2KuulutusSaamePDFtSchema = Yup.object().shape({
  jatkoPaatos2Vaihe: Yup.object()
    .required()
    .shape({
      hyvaksymisPaatosVaiheSaamePDFt: kuulutusSaamePDFtInput(false),
      viimeinenVoimassaolovuosi: Yup.string().required("Päätöksen viimeinen voimassaolovuosi annettava"),
    }),
});
