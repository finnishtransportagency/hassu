import { AsiakirjaTyyppi, Kieli, TallennaProjektiInput } from "@services/api";
import React, { useImperativeHandle, useRef, useState } from "react";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";
import useSnackbars from "src/hooks/useSnackbars";

type EsikatselePdfFunction = (formData: TallennaProjektiInput, asiakirjaTyyppi: AsiakirjaTyyppi, kieli: Kieli) => void;

type PdfPreviewFormProps = {};
type PdfPreviewFormHandle = {
  esikatselePdf: EsikatselePdfFunction;
};

const PdfPreviewForm: React.ForwardRefRenderFunction<PdfPreviewFormHandle, PdfPreviewFormProps> = (_props, ref) => {
  const { data: projekti } = useProjektiRoute();
  const { showErrorMessage } = useSnackbars();

  const pdfFormRef = useRef<HTMLFormElement>(null);
  const [serializedFormData, setSerializedFormData] = useState("{}");
  const [asiakirjaTyyppiFormData, setAsiakirjaTyyppiFormData] = useState<AsiakirjaTyyppi>();

  useImperativeHandle(
    ref,
    () => ({
      esikatselePdf(formData: TallennaProjektiInput, asiakirjaTyyppi: AsiakirjaTyyppi, kieli: Kieli) {
        if (!pdfFormRef.current || !projekti?.oid) {
          showErrorMessage("Asiakirjan esikatselua ei voitu suorittaa");
          return;
        }
        setSerializedFormData(JSON.stringify(formData));
        setAsiakirjaTyyppiFormData(asiakirjaTyyppi);

        pdfFormRef.current.action = `/api/projekti/${projekti.oid}/asiakirja/pdf` + "?kieli=" + kieli;
        pdfFormRef.current.submit();
      },
    }),
    [projekti, showErrorMessage]
  );

  return (
    <form ref={pdfFormRef} target="_blank" method="POST">
      <input value={serializedFormData} type="hidden" name="tallennaProjektiInput" />
      <input value={asiakirjaTyyppiFormData} type="hidden" name="asiakirjaTyyppi" />
    </form>
  );
};

export default React.forwardRef(PdfPreviewForm);
