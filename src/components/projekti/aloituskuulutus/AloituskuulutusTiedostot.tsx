import { Link } from "@mui/material";
import { AloitusKuulutusJulkaisu, Kieli } from "@services/api";
import lowerCase from "lodash/lowerCase";
import { ReactElement } from "react";
import ExtLink from "@components/ExtLink";
import { examineKuulutusPaiva } from "@components/projekti/aloituskuulutus/aloitusKuulutusUtil";

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

  const parseFilename = (path: string) => {
    return path.substring(path.lastIndexOf("/") + 1);
  };

  let { kuulutusPaiva, published } = examineKuulutusPaiva(aloituskuulutusjulkaisu);

  let aloitusKuulutusHref: string | undefined;
  if (published) {
    aloitusKuulutusHref =
      window.location.protocol + "//" + window.location.host + "/suunnitelma/" + oid + "/aloituskuulutus";
  }
  return (
    <>
      <div className="content">
        <p className="vayla-label">Tiedostot</p>
        <p>
          Kuulutus ja ilmoitus ensisijaisella kielellä (
          {lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli)})
        </p>
        {ensisijaisetPDFt && (
          <div className="flex flex-col">
            <div>
              <Link underline="none" href={ensisijaisetPDFt.aloituskuulutusPDFPath}>
                {parseFilename(ensisijaisetPDFt.aloituskuulutusPDFPath)}
              </Link>
            </div>
            <div>
              <Link underline="none" href={ensisijaisetPDFt.aloituskuulutusIlmoitusPDFPath}>
                {parseFilename(ensisijaisetPDFt.aloituskuulutusIlmoitusPDFPath)}
              </Link>
            </div>
          </div>
        )}

        {aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli && (
          <div className="content">
            <p>
              Kuulutus ja ilmoitus toissijaisella kielellä (
              {lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli)})
            </p>
            {toissijaisetPDFt && (
              <div className="flex flex-col">
                <div>
                  <Link underline="none" href={toissijaisetPDFt.aloituskuulutusPDFPath}>
                    {parseFilename(toissijaisetPDFt.aloituskuulutusPDFPath)}
                  </Link>
                </div>
                <div>
                  <Link underline="none" href={toissijaisetPDFt.aloituskuulutusIlmoitusPDFPath}>
                    {parseFilename(toissijaisetPDFt.aloituskuulutusIlmoitusPDFPath)}
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
