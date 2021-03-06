import Section from "@components/layout/Section";
import { Kieli, AsiakirjaTyyppi } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import React from "react";
import lowerCase from "lodash/lowerCase";
import Button from "@components/button/Button";
import { Box } from "@mui/material";
import { useProjekti } from "src/hooks/useProjekti";
import { KuulutuksenTiedotFormValues } from "./KuulutuksenTiedot";
import { useFormContext } from "react-hook-form";

type Props = {
  esikatselePdf: (formData: KuulutuksenTiedotFormValues, asiakirjaTyyppi: AsiakirjaTyyppi, kieli: Kieli) => void;
};

export default function KuulutuksenJaIlmoituksenEsikatselu({ esikatselePdf }: Props) {
  const { data: projekti } = useProjekti();

  const { handleSubmit } = useFormContext<KuulutuksenTiedotFormValues>();

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
        {ensisijainenKieli && (
          <div>
            <p className="mb-10">Esikatsele tiedostot ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
            <Box sx={{ flexDirection: "row-reverse" }}>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_kuulutus_pdf_" + ensisijainenKieli}
                type="submit"
                onClick={handleSubmit((formData) => {
                  esikatselePdf(formData, AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, ensisijainenKieli);
                })}
              >
                Kuulutuksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_pdf_" + ensisijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    formData,
                    AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
                    ensisijainenKieli
                  )
                )}
              >
                Ilmoituksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_lahetekirje_pdf_" + ensisijainenKieli}
                type="button"
                disabled
              >
                Lähetekirjeen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_kiinteiston_omistajalle_pdf_" + ensisijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    formData,
                    AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
                    ensisijainenKieli
                  )
                )}
              >
                Ilmoitus kiinteistön omistajalle esikatselu
              </Button>
            </Box>
          </div>
        )}
        {toissijainenKieli && (
          <div>
            <p className="mb-10">Esikatsele tiedostot toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
            <Box sx={{ flexDirection: "row-reverse" }}>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_kuulutus_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(formData, AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, toissijainenKieli)
                )}
              >
                Kuulutuksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    formData,
                    AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
                    toissijainenKieli
                  )
                )}
              >
                Ilmoituksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_lahetekirje_pdf_" + toissijainenKieli}
                type="button"
                disabled
              >
                Lähetekirjeen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_kiinteiston_omistajalle_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    formData,
                    AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
                    toissijainenKieli
                  )
                )}
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
