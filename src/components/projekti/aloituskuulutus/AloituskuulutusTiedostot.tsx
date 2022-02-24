import { Link } from "@mui/material";
import { AloitusKuulutusJulkaisu } from "@services/api";
import dayjs from "dayjs";
import { lowerCase } from "lodash";
import log from "loglevel";
import { ReactElement } from "react";

interface Props {
  aloituskuulutusjulkaisu?: AloitusKuulutusJulkaisu | null;
}

export default function AloituskuulutusTiedostot({ aloituskuulutusjulkaisu }: Props): ReactElement {
  // const naytaEsikatselu = async (action: string, kieli: Kieli | undefined | null) => {
  //   log.info("Näytä esikatselu ", kieli);
  //   if (!action) {
  //     return;
  //   }
  // };

  return (
    <>
      <div className="content">
        <p className="vayla-label">Tiedostot</p>
        <p>
          Kuulutus ja ilmoitus ensisijaisella kielellä (
          {lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli)})
        </p>
        <div className="content">
          <Link
            underline="none"
            component="button"
            onClick={() => {
              log.info("lataa pdf", aloituskuulutusjulkaisu?.aloituskuulutusPDFPath);
            }}
          >
            tiedosto1.pdf
          </Link>
          <Link
            underline="none"
            component="button"
            onClick={() => {
              log.info("lataa ilmoitus", aloituskuulutusjulkaisu?.aloituskuulutusIlmoitusPDFPath);
            }}
          >
            tiedosto2.pdf
          </Link>
        </div>

        {aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli && (
          <div className="content">
            <p>
              Kuulutus ja ilmoitus toissijaisella kielellä (
              {lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli)})
            </p>
            <div className="content">
              <Link
                underline="none"
                component="button"
                onClick={() => {
                  log.info("lataa pdf 2", aloituskuulutusjulkaisu?.aloituskuulutusPDFPath);
                }}
              >
                tiedosto1.pdf
              </Link>
              <Link
                underline="none"
                component="button"
                onClick={() => {
                  log.info("lataa ilmoitus 2");
                }}
              >
                tiedosto2.pdf
              </Link>
            </div>
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
