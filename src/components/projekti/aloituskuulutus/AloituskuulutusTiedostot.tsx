import { Link } from "@mui/material";
import { AloitusKuulutusJulkaisu, Kieli } from "@services/api";
import lowerCase from "lodash/lowerCase";
import { ReactElement } from "react";
import ExtLink from "@components/ExtLink";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import { splitFilePath } from "../../../util/fileUtil";

interface Props {
  oid: string;
  aloituskuulutusjulkaisu?: AloitusKuulutusJulkaisu | null;
}

export default function AloituskuulutusTiedostot({ aloituskuulutusjulkaisu, oid }: Props): ReactElement {
  if (!oid || !aloituskuulutusjulkaisu) {
    return <></>;
  }
  const getPdft = (kieli: Kieli | undefined | null) => {
    if (!aloituskuulutusjulkaisu || !aloituskuulutusjulkaisu.aloituskuulutusPDFt || !kieli) {
      return undefined;
    }
    return aloituskuulutusjulkaisu.aloituskuulutusPDFt[kieli];
  };

  const ensisijaisetPDFt = getPdft(aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli);
  const toissijaisetPDFt = getPdft(aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli);

  let { kuulutusPaiva, published } = examineKuulutusPaiva(aloituskuulutusjulkaisu?.kuulutusPaiva);

  let aloitusKuulutusHref: string | undefined;
  if (published) {
    aloitusKuulutusHref =
      window.location.protocol + "//" + window.location.host + "/suunnitelma/" + oid + "/aloituskuulutus";
  }
  return (
    <>
      <div className="content">
        <p className="vayla-label">Ladattavat kuulutukset ja ilmoitukset</p>
        <p>
          Kuulutus ja ilmoitus ensisijaisella kielellä (
          {lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli)})
        </p>
        {ensisijaisetPDFt && (
          <div className="flex flex-col mb-4">
            <div>
              <Link underline="none" href={ensisijaisetPDFt.aloituskuulutusPDFPath} target="_blank">
                {splitFilePath(ensisijaisetPDFt.aloituskuulutusPDFPath).fileName}
              </Link>
            </div>
            <div>
              <Link underline="none" href={ensisijaisetPDFt.aloituskuulutusIlmoitusPDFPath} target="_blank">
                {splitFilePath(ensisijaisetPDFt.aloituskuulutusIlmoitusPDFPath).fileName}
              </Link>
            </div>
          </div>
        )}

        {aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli && (
          <div className="content mb-4">
            <p>
              Kuulutus ja ilmoitus toissijaisella kielellä (
              {lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli)})
            </p>
            {toissijaisetPDFt && (
              <div className="flex flex-col">
                <div>
                  <Link underline="none" href={toissijaisetPDFt.aloituskuulutusPDFPath} target="_blank">
                    {splitFilePath(toissijaisetPDFt.aloituskuulutusPDFPath).fileName}
                  </Link>
                </div>
                <div>
                  <Link underline="none" href={toissijaisetPDFt.aloituskuulutusIlmoitusPDFPath} target="_blank">
                    {splitFilePath(toissijaisetPDFt.aloituskuulutusIlmoitusPDFPath).fileName}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="content">
          <p className="vayla-label">Kuulutus julkisella puolella</p>
          {!published && (
            <p>Linkki julkiselle puolelle muodostetaan kuulutuspäivänä. Kuulutuspäivä on {kuulutusPaiva}.</p>
          )}
          {published && <ExtLink href={aloitusKuulutusHref}>Kuulutus palvelun julkisella puolella</ExtLink>}
        </div>
      </div>
    </>
  );
}
