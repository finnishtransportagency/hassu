import * as Yup from "yup";
import { kuulutusSaamePDFtInput } from "./kuulutusSaamePDFtInput";
export const jatkopaatos1KuulutusSaamePDFtSchema = Yup.object().shape({
  jatkoPaatos1Vaihe: Yup.object().required().shape({
    hyvaksymisPaatosVaiheSaamePDFt: kuulutusSaamePDFtInput(),
    viimeinenVoimassaolovuosi: Yup.string().required("Päätöksen viimeinen voimassaolovuosi annettava"),
  }),
});
