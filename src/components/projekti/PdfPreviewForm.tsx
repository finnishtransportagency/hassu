import { AsiakirjaTyyppi, Kieli, TallennaProjektiInput } from "@services/api";
import React, { useImperativeHandle, useRef } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";

type EsikatselePdfFunction = (formData: TallennaProjektiInput, asiakirjaTyyppi: AsiakirjaTyyppi, kieli: Kieli) => void;

type PdfPreviewFormProps = {};
type PdfPreviewFormHandle = {
  esikatselePdf: EsikatselePdfFunction;
};

const PdfPreviewForm: React.ForwardRefRenderFunction<PdfPreviewFormHandle, PdfPreviewFormProps> = (_props, ref) => {
  const { data: projekti } = useProjekti();
  const { showErrorMessage } = useSnackbars();

  const pdfFormRef = useRef<HTMLFormElement>(null);
  const serializedFormDataRef = useRef<HTMLInputElement>(null);
  const asiakirjaTyyppiFormDataRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      esikatselePdf(formData: TallennaProjektiInput, asiakirjaTyyppi: AsiakirjaTyyppi, kieli: Kieli) {
        if (!pdfFormRef.current || !projekti?.oid || !serializedFormDataRef.current || !asiakirjaTyyppiFormDataRef.current) {
          showErrorMessage("Asiakirjan esikatselua ei voitu suorittaa");
          return;
        }

        serializedFormDataRef.current.value = JSON.stringify(formData);
        asiakirjaTyyppiFormDataRef.current.value = asiakirjaTyyppi;

        pdfFormRef.current.action = `/api/projekti/${projekti.oid}/asiakirja/pdf` + "?kieli=" + kieli;
        pdfFormRef.current.submit();
      },
    }),
    [projekti, showErrorMessage]
  );

  return (
    <form ref={pdfFormRef} target="_blank" method="POST">
      <input ref={serializedFormDataRef} type="hidden" name="tallennaProjektiInput" />
      <input ref={asiakirjaTyyppiFormDataRef} type="hidden" name="asiakirjaTyyppi" />
    </form>
  );
};

export default React.forwardRef(PdfPreviewForm);
