import React from "react";
import Section from "@components/layout/Section";
import { AsiakirjaTyyppi, Kieli, TallennaProjektiInput } from "@services/api";
import Button from "@components/button/Button";
import { Box } from "@mui/material";
import { useProjekti } from "src/hooks/useProjekti";
import { KuulutuksenTiedotFormValues } from "./index";
import { useFormContext } from "react-hook-form";
import { isKieliTranslatable } from "hassu-common/kaannettavatKielet";
import { label } from "src/util/textUtil";
import { paatosSpecificRoutesMap, PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { H2 } from "../../../Headings";

type Props = {
  esikatselePdf: (formData: TallennaProjektiInput, asiakirjaTyyppi: AsiakirjaTyyppi, kieli: Kieli) => void;
  paatosTyyppi: PaatosTyyppi;
};

export const convertFormDataToTallennaProjektiInput: (
  formData: KuulutuksenTiedotFormValues,
  paatosTyyppi: PaatosTyyppi
) => TallennaProjektiInput = (formData, paatosTyyppi) => {
  const { paatos, oid, versio, ...rest } = formData;
  const { paatosVaiheAvain } = paatosSpecificRoutesMap[paatosTyyppi];
  if (paatosTyyppi === PaatosTyyppi.JATKOPAATOS1) {
    paatos.viimeinenVoimassaolovuosi = rest.jatkoPaatos1Vaihe.viimeinenVoimassaolovuosi;
  } else if (paatosTyyppi === PaatosTyyppi.JATKOPAATOS2) {
    paatos.viimeinenVoimassaolovuosi = rest.jatkoPaatos2Vaihe.viimeinenVoimassaolovuosi;
  }
  return { oid, versio, [paatosVaiheAvain]: paatos };
};

export default function KuulutuksenJaIlmoituksenEsikatselu({ esikatselePdf, paatosTyyppi }: Props) {
  const { data: projekti } = useProjekti();

  const { handleSubmit } = useFormContext<KuulutuksenTiedotFormValues>();

  const kielitiedot = projekti?.kielitiedot;
  if (!projekti || !kielitiedot) {
    return null;
  }

  const ensisijainenKieli = kielitiedot.ensisijainenKieli;
  const toissijainenKieli = kielitiedot.toissijainenKieli;

  const {
    paatosAsiakirjaTyyppi,
    ilmoitusPaatoskuulutuksestaLausunnonantajilleAsiakirjaTyyppi,
    ilmoitusPaatoskuulutuksestaMuistuttajilleAsiakirjaTyyppi,
    ilmoitusPaatoskuulutuksestaAsiakirjaTyyppi,
    ilmoitusPaatoskuulutuksestaKunnalleJaToiselleViranomaiselleAsiakirjaTyyppi,
  } = paatosSpecificRoutesMap[paatosTyyppi];

  return (
    <Section>
      <H2>Kuulutuksen ja ilmoituksen esikatselu</H2>
      <div style={{ marginTop: "2em" }}>
        {isKieliTranslatable(ensisijainenKieli) && (
          <div>
            <p className="mb-10">
              {label({
                label: "Esikatsele tiedostot ennen tallentamista.",
                inputLanguage: Kieli.SUOMI,
                kielitiedot,
              })}
            </p>
            <Box sx={{ flexDirection: "row-reverse" }}>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_kuulutus_pdf_" + ensisijainenKieli}
                type="submit"
                onClick={handleSubmit((formData) => {
                  esikatselePdf(convertFormDataToTallennaProjektiInput(formData, paatosTyyppi), paatosAsiakirjaTyyppi, ensisijainenKieli);
                })}
              >
                Kuulutuksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_hyvaksymispaatoksen_kuulutuksesta_pdf_" + ensisijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                    ilmoitusPaatoskuulutuksestaAsiakirjaTyyppi,
                    ensisijainenKieli
                  )
                )}
              >
                Ilmoituksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_kunnille_ja_viranomaisille_pdf_" + ensisijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                    ilmoitusPaatoskuulutuksestaKunnalleJaToiselleViranomaiselleAsiakirjaTyyppi,
                    ensisijainenKieli
                  )
                )}
              >
                Ilmoitus kunnalle ja toiselle viranomaiselle esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={
                  paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS
                    ? "preview_ilmoitus_lausunnontajille_pdf_" + ensisijainenKieli
                    : "preview_ilmoitus_maakuntaliitoille_pdf_" + ensisijainenKieli
                }
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                    ilmoitusPaatoskuulutuksestaLausunnonantajilleAsiakirjaTyyppi,
                    ensisijainenKieli
                  )
                )}
              >
                {paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS
                  ? "Ilmoitus lausunnonantajille esikatselu"
                  : "Ilmoitus maakuntaliitoille esikatselu"}
              </Button>
              {ilmoitusPaatoskuulutuksestaMuistuttajilleAsiakirjaTyyppi && (
                <Button
                  style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                  id={"preview_ilmoitus_muistuttajille_pdf_" + ensisijainenKieli}
                  type="button"
                  onClick={handleSubmit((formData) => {
                    esikatselePdf(
                      convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                      ilmoitusPaatoskuulutuksestaMuistuttajilleAsiakirjaTyyppi,
                      ensisijainenKieli
                    );
                  })}
                >
                  Ilmoitus muistuttajille esikatselu
                </Button>
              )}
            </Box>
          </div>
        )}
        {isKieliTranslatable(toissijainenKieli) && (
          <div>
            <p className="mb-10">
              {label({
                label: "Esikatsele tiedostot ennen tallentamista.",
                inputLanguage: toissijainenKieli,
                kielitiedot,
              })}
            </p>
            <Box sx={{ flexDirection: "row-reverse" }}>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_kuulutus_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(convertFormDataToTallennaProjektiInput(formData, paatosTyyppi), paatosAsiakirjaTyyppi, toissijainenKieli)
                )}
              >
                Kuulutuksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_hyvaksymispaatoksen_kuulutuksesta_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                    ilmoitusPaatoskuulutuksestaAsiakirjaTyyppi,
                    toissijainenKieli
                  )
                )}
              >
                Ilmoituksen esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_kunnille_ja_viranomaisille_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                    ilmoitusPaatoskuulutuksestaKunnalleJaToiselleViranomaiselleAsiakirjaTyyppi,
                    toissijainenKieli
                  )
                )}
              >
                Ilmoitus kunnalle ja toiselle viranomaiselle esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={
                  paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS
                    ? "preview_ilmoitus_lausunnontajille_pdf_" + toissijainenKieli
                    : "preview_ilmoitus_maakuntaliitoille_pdf_" + ensisijainenKieli
                }
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                    ilmoitusPaatoskuulutuksestaLausunnonantajilleAsiakirjaTyyppi,
                    toissijainenKieli
                  )
                )}
              >
                {paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS
                  ? "Ilmoitus lausunnonantajille esikatselu"
                  : "Ilmoitus maakuntaliitoille esikatselu"}
              </Button>
              {ilmoitusPaatoskuulutuksestaMuistuttajilleAsiakirjaTyyppi && (
                <Button
                  style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                  id={"preview_ilmoitus_muistuttajille_pdf_" + toissijainenKieli}
                  type="button"
                  onClick={handleSubmit((formData) => {
                    esikatselePdf(
                      convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                      ilmoitusPaatoskuulutuksestaMuistuttajilleAsiakirjaTyyppi,
                      toissijainenKieli
                    );
                  })}
                >
                  Ilmoitus muistuttajille esikatselu
                </Button>
              )}
            </Box>
          </div>
        )}
      </div>
    </Section>
  );
}
