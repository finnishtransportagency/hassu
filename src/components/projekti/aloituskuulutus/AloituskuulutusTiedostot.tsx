import { Link } from "@mui/material";
import { AloitusKuulutusJulkaisu, Kieli } from "@services/api";
import dayjs from "dayjs";
import { lowerCase } from "lodash";
import log from "loglevel";
import { ReactElement } from "react";

interface Props {
  aloituskuulutusjulkaisu?: AloitusKuulutusJulkaisu | null;
}

export default function AloituskuulutusTiedostot({ aloituskuulutusjulkaisu }: Props): ReactElement {
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
                  <Link
                    underline="none"
                    href={toissijaisetPDFt.aloituskuulutusPDFPath}
                  >
                    {parseFilename(toissijaisetPDFt.aloituskuulutusPDFPath)}
                  </Link>
                </div>
                <div>
                  <Link
                    underline="none"
                    href={toissijaisetPDFt.aloituskuulutusIlmoitusPDFPath}
                  >
                    {parseFilename(toissijaisetPDFt.aloituskuulutusIlmoitusPDFPath)}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="content">
          <p className="vayla-label">Kuulutus julkisella puolella</p>
          <p>
            Linkki julkiselle puolelle muodostetaan kuulutuspäivänä. Kuulutuspäivä on{" "}
            {dayjs(aloituskuulutusjulkaisu?.kuulutusPaiva).format("DD.MM.YYYY")}.
          </p>
        </div>
      </div>
    </>
  );
}
