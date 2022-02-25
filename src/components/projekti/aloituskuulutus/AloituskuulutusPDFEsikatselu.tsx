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

  return (
    <>
      <div className="content">
        <p className="vayla-label">Esikatseltavat tiedostot</p>
        <p>
          Kuulutus ja ilmoitus ensisijaisella kielellä (
          {lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli)})
        </p>
        <div className="flex flex-col lg:flex-row gap-6">
          <Button
            type="submit"
            onClick={() =>
              naytaEsikatselu(
                `/api/projekti/${oid}/aloituskuulutus/pdf`,
                aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli
              )
            }
          >
            Kuulutuksen esikatselu
          </Button>
          <Button
            type="submit"
            onClick={() =>
              naytaEsikatselu(
                `/api/projekti/${oid}/aloituskuulutus/ilmoitus/pdf`,
                aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli
              )
            }
          >
            Ilmoituksen esikatselu
          </Button>
        </div>
      </div>
      {aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli && (
        <div className="content">
          <p>
            Kuulutus ja ilmoitus toissijaisella kielellä (
            {lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli)})
          </p>
          <div className="flex flex-col lg:flex-row gap-6">
            <Button
              type="submit"
              onClick={() =>
                naytaEsikatselu(
                  `/api/projekti/${oid}/aloituskuulutus/pdf`,
                  aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli
                )
              }
            >
              Kuulutukset esikatselu
            </Button>
            <Button
              type="submit"
              onClick={() =>
                naytaEsikatselu(
                  `/api/projekti/${oid}/aloituskuulutus/ilmoitus/pdf`,
                  aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli
                )
              }
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
