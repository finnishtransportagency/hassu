import React from "react";
import Section from "@components/layout/Section";
import { Kieli, AsiakirjaTyyppi, TallennaProjektiInput } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import lowerCase from "lodash/lowerCase";
import Button from "@components/button/Button";
import { Box } from "@mui/material";
import { useProjekti } from "src/hooks/useProjekti";
import { KuulutuksenTiedotFormValues } from "./index";
import { useFormContext } from "react-hook-form";
import { paatosSpecificRoutesMap, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import { isKieliTranslatable } from "hassu-common/kaannettavatKielet";

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
        {isKieliTranslatable(ensisijainenKieli) && (
          <div>
            <p className="mb-10">Esikatsele tiedostot ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
            <Box sx={{ flexDirection: "row-reverse" }}>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_kuulutus_pdf_" + ensisijainenKieli}
                type="submit"
                onClick={handleSubmit((formData) => {
                  esikatselePdf(
                    convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                    paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS
                      ? AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS
                      : AsiakirjaTyyppi.JATKOPAATOSKUULUTUS,
                    ensisijainenKieli
                  );
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
                    paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS
                      ? AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA
                      : AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA,
                    ensisijainenKieli
                  )
                )}
              >
                Ilmoituksen esikatselu
              </Button>
              {paatosTyyppi !== PaatosTyyppi.HYVAKSYMISPAATOS && (
                <Button
                  style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                  id={"preview_ilmoitus_lahetekirje_pdf_" + ensisijainenKieli}
                  type="button"
                  onClick={handleSubmit((formData) => {
                    esikatselePdf(
                      convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                      AsiakirjaTyyppi.JATKOPAATOSKUULUTUS_LAHETEKIRJE,
                      ensisijainenKieli
                    );
                  })}
                  disabled
                >
                  Lähetekirjeen esikatselu
                </Button>
              )}
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_kunnille_ja_viranomaisille_pdf_" + ensisijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                    paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS
                      ? AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE
                      : AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE,
                    ensisijainenKieli
                  )
                )}
              >
                Ilmoitus kunnalle ja toiselle viranomaiselle esikatselu
              </Button>
              {paatosTyyppi !== PaatosTyyppi.HYVAKSYMISPAATOS && (
                <Button
                  style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                  id={"preview_ilmoitus_maakuntaliitoille_pdf_" + ensisijainenKieli}
                  type="button"
                  onClick={handleSubmit((formData) =>
                    esikatselePdf(
                      convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                      AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_MAAKUNTALIITOILLE,
                      ensisijainenKieli
                    )
                  )}
                >
                  Ilmoitus maakuntaliitoille esikatselu
                </Button>
              )}
              {paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS && (
                <>
                  <Button
                    style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                    id={"preview_ilmoitus_lausunnontajille_pdf_" + ensisijainenKieli}
                    type="button"
                    onClick={handleSubmit((formData) =>
                      esikatselePdf(
                        convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE,
                        ensisijainenKieli
                      )
                    )}
                  >
                    Ilmoitus lausunnonantajille esikatselu
                  </Button>
                  <Button
                    style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                    id={"preview_ilmoitus_muistuttajille_pdf_" + ensisijainenKieli}
                    type="button"
                    onClick={handleSubmit((formData) => {
                      esikatselePdf(
                        convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE,
                        ensisijainenKieli
                      );
                    })}
                  >
                    Ilmoitus muistuttajille esikatselu
                  </Button>
                </>
              )}
            </Box>
          </div>
        )}
        {isKieliTranslatable(toissijainenKieli) && (
          <div>
            <p className="mb-10">Esikatsele tiedostot toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
            <Box sx={{ flexDirection: "row-reverse" }}>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_kuulutus_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                    AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS,
                    toissijainenKieli
                  )
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
                    AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA,
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
                    AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE,
                    toissijainenKieli
                  )
                )}
              >
                Ilmoitus kunnalle ja toiselle viranomaiselle esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_lausunnonantajille_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                    AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE,
                    toissijainenKieli
                  )
                )}
              >
                Ilmoitus lausunnonantajille esikatselu
              </Button>
              <Button
                style={{ display: "inline", marginBottom: "2em", marginRight: "2em" }}
                id={"preview_ilmoitus_muistuttajille_pdf_" + toissijainenKieli}
                type="button"
                onClick={handleSubmit((formData) =>
                  esikatselePdf(
                    convertFormDataToTallennaProjektiInput(formData, paatosTyyppi),
                    AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE,
                    toissijainenKieli
                  )
                )}
              >
                Ilmoitus muistuttajille esikatselu
              </Button>
            </Box>
          </div>
        )}
      </div>
    </Section>
  );
}
