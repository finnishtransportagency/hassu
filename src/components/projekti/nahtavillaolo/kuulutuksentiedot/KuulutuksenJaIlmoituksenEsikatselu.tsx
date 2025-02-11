import Section from "@components/layout/Section";
import { Kieli, AsiakirjaTyyppi } from "@services/api";
import React from "react";
import Button from "@components/button/Button";
import { Box } from "@mui/material";
import { useProjekti } from "src/hooks/useProjekti";
import { KuulutuksenTiedotFormValues } from "./KuulutuksenTiedot";
import { useFormContext } from "react-hook-form";
import { isKieliTranslatable } from "hassu-common/kaannettavatKielet";
import { label } from "src/util/textUtil";
import { H2 } from "../../../Headings";

type Props = {
  esikatselePdf: (formData: KuulutuksenTiedotFormValues, asiakirjaTyyppi: AsiakirjaTyyppi, kieli: Kieli) => void;
};

export default function KuulutuksenJaIlmoituksenEsikatselu({ esikatselePdf }: Readonly<Props>) {
  const { data: projekti } = useProjekti();

  const { handleSubmit } = useFormContext<KuulutuksenTiedotFormValues>();

  const kielitiedot = projekti?.kielitiedot;

  if (!projekti || !kielitiedot) {
    return null;
  }

  const ensisijainenKieli = kielitiedot.ensisijainenKieli;
  const toissijainenKieli = kielitiedot.toissijainenKieli;

  return (
    <Section>
      <H2>Kuulutuksen ja ilmoituksen esikatselu</H2>
      <div style={{ marginTop: "2em" }}>
        {isKieliTranslatable(ensisijainenKieli) && (
          <div>
            <p className="mb-10">
              {label({
                label: "Esikatsele tiedostot.",
                inputLanguage: ensisijainenKieli,
                kielitiedot,
              })}
            </p>
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
                  esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE, ensisijainenKieli)
                )}
              >
                Ilmoituksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_kiinteiston_omistajalle_pdf_" + ensisijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE, ensisijainenKieli)
                )}
              >
                Ilmoitus kiinteistön omistajalle esikatselu
              </Button>
            </Box>
          </div>
        )}
        {isKieliTranslatable(toissijainenKieli) && (
          <div>
            <p className="mb-10">
              {" "}
              {label({
                label: "Esikatsele tiedostot.",
                inputLanguage: toissijainenKieli,
                kielitiedot,
              })}
            </p>
            <Box sx={{ flexDirection: "row-reverse" }}>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_kuulutus_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) => esikatselePdf(formData, AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, toissijainenKieli))}
              >
                Kuulutuksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE, toissijainenKieli)
                )}
              >
                Ilmoituksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_kiinteiston_omistajalle_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE, toissijainenKieli)
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
