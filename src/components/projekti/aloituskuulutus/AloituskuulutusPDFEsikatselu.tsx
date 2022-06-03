import Button from "@components/button/Button";
import { AloitusKuulutusJulkaisu, Kieli } from "@services/api";
import lowerCase from "lodash/lowerCase";
import log from "loglevel";
import { ReactElement, useRef } from "react";

interface Props {
  oid?: string;
  aloituskuulutusjulkaisu?: AloitusKuulutusJulkaisu | null;
}

export default function AloituskuulutusPDFEsikatselu({ oid, aloituskuulutusjulkaisu }: Props): ReactElement {
  const pdfFormRef = useRef<HTMLFormElement | null>(null);

  const naytaEsikatselu = async (action: string, kieli: Kieli | undefined | null) => {
    log.info("Näytä esikatselu ", kieli);
    if (!action) {
      return;
    }

    if (pdfFormRef.current) {
      pdfFormRef.current.action = action + "?kieli=" + kieli;
      pdfFormRef.current?.submit();
    }
  };

  const ensisijainenKieli = aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli;
  const toissijainenKieli = aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli;
  return (
    <>
      <div className="content">
        <p className="vayla-label">Esikatseltavat tiedostot</p>
        <p>Kuulutus ja ilmoitus ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
        <div className="flex flex-col lg:flex-row gap-6">
          <Button
            id={"preview_kuulutus_pdf_" + ensisijainenKieli}
            type="submit"
            onClick={() => naytaEsikatselu(`/api/projekti/${oid}/aloituskuulutus/pdf`, ensisijainenKieli)}
          >
            Kuulutuksen esikatselu
          </Button>
          <Button
            id={"preview_ilmoitus_pdf_" + ensisijainenKieli}
            type="submit"
            onClick={() => naytaEsikatselu(`/api/projekti/${oid}/aloituskuulutus/ilmoitus/pdf`, ensisijainenKieli)}
          >
            Ilmoituksen esikatselu
          </Button>
        </div>
      </div>
      {toissijainenKieli && (
        <div className="content">
          <p>Kuulutus ja ilmoitus toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
          <div className="flex flex-col lg:flex-row gap-6">
            <Button
              id={"preview_kuulutus_pdf_" + toissijainenKieli}
              type="submit"
              onClick={() => naytaEsikatselu(`/api/projekti/${oid}/aloituskuulutus/pdf`, toissijainenKieli)}
            >
              Kuulutukset esikatselu
            </Button>
            <Button
              id={"preview_ilmoitus_pdf_" + toissijainenKieli}
              type="submit"
              onClick={() => naytaEsikatselu(`/api/projekti/${oid}/aloituskuulutus/ilmoitus/pdf`, toissijainenKieli)}
            >
              Ilmoituksen esikatselu
            </Button>
          </div>
        </div>
      )}
      <form ref={pdfFormRef} target="_blank" method="POST">
        <input type="hidden" name="naytaEsikatselu" value="" />
      </form>
    </>
  );
}
