import Section from "@components/layout/Section";
import { Projekti, Kieli } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import React from "react";
import lowerCase from "lodash/lowerCase";
import Button from "@components/button/Button";
import { useRef } from "react";
import log from "loglevel";
import { Box } from "@mui/material";

type Props = {
  projekti: Projekti | null | undefined;
};

export default function KuulutuksenJaIlmoituksenEsikatselu({ projekti }: Props) {
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

  const ensisijainenKieli = projekti?.kielitiedot?.ensisijainenKieli;
  const toissijainenKieli = projekti?.kielitiedot?.toissijainenKieli;

  if (!projekti) {
    return null;
  }

  return (
    <Section>
      <h4 className="vayla-small-title">Kuulutuksen ja ilmoituksen esikatselu</h4>
      <Notification type={NotificationType.INFO_GRAY}>
        Esikatsele kuulutus ja ilmoitus ennen hyväksyntään lähettämistä.{" "}
      </Notification>
      <div style={{ marginTop: "4em" }}>
        <div>
          <p className="mb-10">Esikatsele tiedostot ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
          <Box sx={{ flexDirection: "row-reverse" }}>
            <Button
              style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
              id={"preview_kuulutus_pdf_" + ensisijainenKieli}
              type="submit"
              disabled
              onClick={() => naytaEsikatselu(`/api/projekti/${projekti.oid}/nahtavillaolo/pdf`, ensisijainenKieli)}
            >
              Kuulutuksen esikatselu
            </Button>
            <Button
              style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
              id={"preview_ilmoitus_pdf_" + ensisijainenKieli}
              type="submit"
              disabled
              onClick={() =>
                naytaEsikatselu(`/api/projekti/${projekti.oid}/nahtavillaolo/ilmoitus/pdf`, ensisijainenKieli)
              }
            >
              Ilmoituksen esikatselu
            </Button>
            <Button
              style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
              id={"preview_lahetekirje_pdf_" + ensisijainenKieli}
              type="submit"
              disabled
              onClick={() =>
                naytaEsikatselu(`/api/projekti/${projekti.oid}/nahtavillaolo/lahetekirje/pdf`, ensisijainenKieli)
              }
            >
              Lähetekirjeen esikatselu
            </Button>
            <Button
              style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
              id={"preview_ilmoitus_kiinteiston_omistajalle_pdf_" + ensisijainenKieli}
              type="submit"
              disabled
              onClick={() =>
                naytaEsikatselu(
                  `/api/projekti/${projekti.oid}/nahtavillaolo/ilmoitus_kiinteiston_omistajalle/pdf`,
                  ensisijainenKieli
                )
              }
            >
              Ilmoitus kiinteistön omistajalle esikatselu
            </Button>
          </Box>
        </div>
        {toissijainenKieli && (
          <div>
            <p className="mb-10">Esikatsele tiedostot toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
            <Box sx={{ flexDirection: "row-reverse" }}>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_kuulutus_pdf_" + toissijainenKieli}
                type="submit"
                disabled
                onClick={() => naytaEsikatselu(`/api/projekti/${projekti.oid}/nahtavillaolo/pdf`, toissijainenKieli)}
              >
                Kuulutuksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_pdf_" + toissijainenKieli}
                type="submit"
                disabled
                onClick={() =>
                  naytaEsikatselu(`/api/projekti/${projekti.oid}/nahtavillaolo/ilmoitus/pdf`, toissijainenKieli)
                }
              >
                Ilmoituksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_lahetekirje_pdf_" + toissijainenKieli}
                type="submit"
                disabled
                onClick={() =>
                  naytaEsikatselu(`/api/projekti/${projekti.oid}/nahtavillaolo/lahetekirje/pdf`, toissijainenKieli)
                }
              >
                Lähetekirjeen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_kiinteiston_omistajalle_pdf_" + toissijainenKieli}
                type="submit"
                disabled
                onClick={() =>
                  naytaEsikatselu(
                    `/api/projekti/${projekti.oid}/nahtavillaolo/ilmoitus_kiinteiston_omistajalle/pdf`,
                    toissijainenKieli
                  )
                }
              >
                Ilmoitus kiinteistön omistajalle esikatselu
              </Button>
            </Box>
          </div>
        )}
      </div>
    </Section>
  );
}
