import React from "react";
import Section from "@components/layout/Section";
import { Kieli, AsiakirjaTyyppi } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import lowerCase from "lodash/lowerCase";
import Button from "@components/button/Button";
import { Box } from "@mui/material";
import { useProjekti } from "src/hooks/useProjekti";
import { KuulutuksenTiedotFormValues } from "./index";
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
      <Notification type={NotificationType.INFO_GRAY}>Esikatsele kuulutus ja ilmoitus ennen hyväksyntään lähettämistä. </Notification>
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
                  console.log(formData);
                  esikatselePdf(formData, AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS, ensisijainenKieli);
                })}
              >
                Kuulutuksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_kunnille_pdf_" + ensisijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE, ensisijainenKieli)
                )}
              >
                Ilmoitus kunnille esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_toiselle_viranomaiselle_pdf_" + ensisijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE, ensisijainenKieli)
                )}
              >
                Lähetekirjeen esikatselu
              </Button>
              <Button
                disabled
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_toiselle_viranomaiselle_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE, ensisijainenKieli)
                )}
              >
                Ilmoitus maakuntaliitoille esikatselu
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
                onClick={handleSubmit((formData) => esikatselePdf(formData, AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS, toissijainenKieli))}
              >
                Kuulutuksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_kunnille_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE, toissijainenKieli)
                )}
              >
                Ilmoitus kunnille esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_toiselle_viranomaiselle_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE, toissijainenKieli)
                )}
              >
                Lähetekirjeen esikatselu
              </Button>
              <Button
                disabled
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_toiselle_viranomaiselle_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE, toissijainenKieli)
                )}
              >
                Ilmoitus maakuntaliitoille esikatselu
              </Button>
            </Box>
          </div>
        )}
      </div>
    </Section>
  );
}
