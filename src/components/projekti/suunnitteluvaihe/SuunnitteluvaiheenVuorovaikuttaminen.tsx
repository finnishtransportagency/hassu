import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import SectionContent from "@components/layout/SectionContent";
import { TallennaProjektiInput, api, VuorovaikutusInput, LinkkiInput, Vuorovaikutus, AsiakirjaTyyppi, KirjaamoOsoite } from "@services/api";
import Section from "@components/layout/Section";
import React, { ReactElement, useEffect, useState, useMemo, useCallback } from "react";
import Button from "@components/button/Button";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuSpinner from "@components/HassuSpinner";
import { vuorovaikutusSchema } from "src/schemas/vuorovaikutus";
import HassuStack from "@components/layout/HassuStack";
import { Stack } from "@mui/material";
import HyvaksymisDialogi from "./HyvaksymisDialogi";
import EsitettavatYhteystiedot from "./EsitettavatYhteystiedot";
import LuonnoksetJaAineistot from "./LuonnoksetJaAineistot/LuonnoksetJaAineistot";
import IlmoituksenVastaanottajat from "./IlmoituksenVastaanottajat";
import { removeTypeName } from "src/util/removeTypeName";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import VuorovaikuttamisenInfo from "./VuorovaikuttamisenInfo";
import PaivamaaratJaTiedot from "./PaivamaaratJaTiedot";
import LukutilaLinkkiJaKutsut from "./LukutilaLinkkiJaKutsut";
import VuorovaikutusMahdollisuudet from "./VuorovaikutusMahdollisuudet";
import VuorovaikutustilaisuusDialog from "./VuorovaikutustilaisuusDialog";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import PdfPreviewForm from "../PdfPreviewForm";
import { lowerCase } from "lodash";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;

export type VuorovaikutusFormValues = ProjektiFields & {
  suunnitteluVaihe: {
    vuorovaikutus: Pick<
      VuorovaikutusInput,
      | "esittelyaineistot"
      | "suunnitelmaluonnokset"
      | "esitettavatYhteystiedot"
      | "kysymyksetJaPalautteetViimeistaan"
      | "ilmoituksenVastaanottajat"
      | "videot"
      | "suunnittelumateriaali"
      | "vuorovaikutusJulkaisuPaiva"
      | "vuorovaikutusNumero"
      | "vuorovaikutusTilaisuudet"
      | "julkinen"
    >;
  };
};

interface Props {
  isDirtyHandler: (isDirty: boolean) => void;
  vuorovaikutusnro: number;
}

const defaultListWithEmptyLink = (list: LinkkiInput[] | null | undefined): LinkkiInput[] => {
  if (!list || !list.length) {
    return [{ url: "", nimi: "" }];
  }
  return list.map((link) => ({ nimi: link.nimi, url: link.url }));
};

const defaultVuorovaikutus: Vuorovaikutus = {
  __typename: "Vuorovaikutus",
  vuorovaikutusNumero: 1,
};

export default function SuunnitteluvaiheenVuorovaikuttaminen(props: Props): ReactElement {
  const { data: projekti, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();
  return (
    <>
      {projekti && kirjaamoOsoitteet && (
        <SuunnitteluvaiheenVuorovaikuttaminenForm {...props} {...{ projekti, reloadProjekti, kirjaamoOsoitteet }} />
      )}
    </>
  );
}

type SuunnitteluvaiheenVuorovaikuttaminenFormProps = {
  projekti: ProjektiLisatiedolla;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
  kirjaamoOsoitteet: KirjaamoOsoite[];
} & Props;

function SuunnitteluvaiheenVuorovaikuttaminenForm({
  isDirtyHandler,
  vuorovaikutusnro,
  projekti,
  reloadProjekti,
  kirjaamoOsoitteet,
}: SuunnitteluvaiheenVuorovaikuttaminenFormProps): ReactElement {
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [openHyvaksy, setOpenHyvaksy] = useState(false);
  const [openVuorovaikutustilaisuus, setOpenVuorovaikutustilaisuus] = useState(false);
  const [aineistoMuokkaustila, setAineistoMuokkaustila] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);
  const [formContext, setFormContext] = useState<VuorovaikutusFormValues>();

  const vuorovaikutus = useMemo(
    () =>
      projekti?.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
        return v.vuorovaikutusNumero === vuorovaikutusnro;
      }) || defaultVuorovaikutus,
    [projekti, vuorovaikutusnro]
  );

  const defaultValues: VuorovaikutusFormValues = useMemo(() => {
    return {
      oid: projekti.oid,
      suunnitteluVaihe: {
        vuorovaikutus: {
          esittelyaineistot:
            vuorovaikutus?.esittelyaineistot?.map(({ dokumenttiOid, nimi }) => ({
              dokumenttiOid,
              nimi,
            })) || [],
          suunnitelmaluonnokset:
            vuorovaikutus?.suunnitelmaluonnokset?.map(({ dokumenttiOid, nimi }) => ({
              dokumenttiOid,
              nimi,
            })) || [],
          vuorovaikutusNumero: vuorovaikutusnro,
          vuorovaikutusJulkaisuPaiva: vuorovaikutus?.vuorovaikutusJulkaisuPaiva || "",
          kysymyksetJaPalautteetViimeistaan: vuorovaikutus?.kysymyksetJaPalautteetViimeistaan || "",
          esitettavatYhteystiedot: {
            yhteysTiedot: vuorovaikutus?.esitettavatYhteystiedot?.yhteysTiedot?.map((yhteystieto) => removeTypeName(yhteystieto)) || [],
            yhteysHenkilot: vuorovaikutus?.esitettavatYhteystiedot?.yhteysHenkilot,
          },
          ilmoituksenVastaanottajat: defaultVastaanottajat(projekti, vuorovaikutus?.ilmoituksenVastaanottajat, kirjaamoOsoitteet),
          vuorovaikutusTilaisuudet:
            vuorovaikutus?.vuorovaikutusTilaisuudet?.map((tilaisuus) => {
              const { __typename, ...vuorovaikutusTilaisuusInput } = tilaisuus;
              const { esitettavatYhteystiedot } = vuorovaikutusTilaisuusInput;
              vuorovaikutusTilaisuusInput.esitettavatYhteystiedot = esitettavatYhteystiedot?.map((yt) => removeTypeName(yt)) || [];
              return vuorovaikutusTilaisuusInput;
            }) || [],
          julkinen: !!vuorovaikutus?.julkinen,
          videot: defaultListWithEmptyLink(vuorovaikutus?.videot as LinkkiInput[]),
          suunnittelumateriaali: (removeTypeName(vuorovaikutus?.suunnittelumateriaali) as LinkkiInput) || {
            nimi: "",
            url: "",
          },
        },
      },
    };
  }, [projekti, vuorovaikutusnro, vuorovaikutus, kirjaamoOsoitteet]);

  const formOptions: UseFormProps<VuorovaikutusFormValues> = useMemo(() => {
    return {
      resolver: yupResolver(vuorovaikutusSchema, { abortEarly: false, recursive: true }),
      mode: "onChange",
      reValidateMode: "onChange",
      defaultValues,
      context: formContext,
    };
  }, [defaultValues, formContext]);

  const useFormReturn = useForm<VuorovaikutusFormValues>(formOptions);
  const {
    register,
    reset,
    handleSubmit,
    formState: { isDirty },
    getValues,
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const updateFormContext = useCallback(() => {
    setFormContext(getValues());
  }, [setFormContext, getValues]);

  const saveSunnitteluvaihe = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      setIsFormSubmitting(true);
      await api.tallennaProjekti(formData);
      if (reloadProjekti) await reloadProjekti();
      reset(formData);
    },
    [reset, reloadProjekti]
  );

  const saveDraft = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      setIsFormSubmitting(true);
      try {
        await saveSunnitteluvaihe(formData);
        showSuccessMessage("Tallennus onnistui!");
      } catch (e) {
        log.error("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe");
      }
      setIsFormSubmitting(false);
    },
    [setIsFormSubmitting, showSuccessMessage, showErrorMessage, saveSunnitteluvaihe]
  );

  const saveAndPublish = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      setIsFormSubmitting(true);
      try {
        formData.suunnitteluVaihe.vuorovaikutus.julkinen = true;
        await saveSunnitteluvaihe(formData);
        showSuccessMessage("Tallennus onnistui!");
      } catch (e) {
        log.error("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe");
      }
      setOpenHyvaksy(false);
      setOpenVuorovaikutustilaisuus(false);
      setAineistoMuokkaustila(false);
      setIsFormSubmitting(false);
    },
    [saveSunnitteluvaihe, showErrorMessage, showSuccessMessage]
  );

  const saveForm = useMemo(() => {
    return handleSubmit(saveAndPublish);
  }, [handleSubmit, saveAndPublish]);

  useEffect(() => {
    isDirtyHandler(isDirty);
  }, [isDirty, isDirtyHandler]);

  const handleClickOpenHyvaksy = () => {
    setOpenHyvaksy(true);
  };

  const handleClickCloseHyvaksy = () => {
    setOpenHyvaksy(false);
  };

  const ilmoituksenVastaanottajat = getValues("suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat");

  const ensisijainenKieli = projekti.kielitiedot?.ensisijainenKieli;
  const toissijainenKieli = projekti.kielitiedot?.toissijainenKieli;
  const esikatselePdf = pdfFormRef.current?.esikatselePdf;

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <fieldset>
            <Section className="mb-4">
              <SectionContent>
                <h3 className="vayla-small-title">Vuorovaikuttaminen</h3>
                <VuorovaikuttamisenInfo vuorovaikutus={vuorovaikutus} />
              </SectionContent>
              <PaivamaaratJaTiedot projekti={projekti} vuorovaikutusnro={vuorovaikutusnro} />
            </Section>
            <VuorovaikutusMahdollisuudet
              projekti={projekti}
              vuorovaikutus={vuorovaikutus}
              setOpenVuorovaikutustilaisuus={setOpenVuorovaikutustilaisuus}
            />
            <VuorovaikutustilaisuusDialog
              open={openVuorovaikutustilaisuus}
              windowHandler={(t: boolean) => {
                setOpenVuorovaikutustilaisuus(t);
              }}
              tilaisuudet={vuorovaikutus?.vuorovaikutusTilaisuudet}
              kayttoOikeudet={projekti.kayttoOikeudet}
              julkinen={vuorovaikutus?.julkinen || false}
              avaaHyvaksymisDialogi={() => setOpenHyvaksy(true)}
            />
            <LuonnoksetJaAineistot
              saveForm={saveForm}
              muokkaustila={aineistoMuokkaustila}
              setMuokkaustila={setAineistoMuokkaustila}
              vuorovaikutus={vuorovaikutus}
              updateFormContext={updateFormContext}
            />
            <EsitettavatYhteystiedot vuorovaikutusnro={vuorovaikutusnro} />
            {vuorovaikutus?.julkinen && <LukutilaLinkkiJaKutsut vuorovaikutus={vuorovaikutus} projekti={projekti} />}
            <IlmoituksenVastaanottajat kirjaamoOsoitteet={kirjaamoOsoitteet} vuorovaikutus={vuorovaikutus} />
            {!vuorovaikutus?.julkinen && !!esikatselePdf && (
              <Section>
                <h4 className="vayla-small-title">Kutsun ja ilmoituksen esikatselu</h4>
                <SectionContent largeGaps>
                  {ensisijainenKieli && (
                    <>
                      <p>Esikatsele tiedostot ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
                      <HassuStack direction={["column", "column", "row"]}>
                        <Button
                          type="submit"
                          id={`preview_kutsu_pdf_${ensisijainenKieli}`}
                          onClick={handleSubmit((formData) =>
                            esikatselePdf(formData, AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU, ensisijainenKieli)
                          )}
                        >
                          Kutsun esikatselu
                        </Button>
                        <Button type="submit" disabled>
                          Ilmoituksen esikatselu
                        </Button>
                      </HassuStack>
                    </>
                  )}
                  {toissijainenKieli && (
                    <>
                      <p>Esikatsele tiedostot toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
                      <HassuStack direction={["column", "column", "row"]}>
                        <Button
                          type="submit"
                          id={`preview_kutsu_pdf_${toissijainenKieli}`}
                          onClick={handleSubmit((formData) =>
                            esikatselePdf(formData, AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU, toissijainenKieli)
                          )}
                        >
                          Kutsun esikatselu
                        </Button>
                        <Button type="submit" disabled>
                          Ilmoituksen esikatselu
                        </Button>
                      </HassuStack>
                    </>
                  )}
                </SectionContent>
              </Section>
            )}
            {!vuorovaikutus?.julkinen && (
              <Section noDivider>
                <Stack justifyContent={[undefined, undefined, "flex-end"]} direction={["column", "column", "row"]}>
                  <Button id="save_suunnitteluvaihe_vuorovaikutukset_draft" onClick={handleSubmit(saveDraft)}>
                    Tallenna luonnos
                  </Button>
                  <Button primary id="save_and_publish" onClick={handleSubmit(handleClickOpenHyvaksy)}>
                    Tallenna julkaistavaksi
                  </Button>
                </Stack>
              </Section>
            )}
          </fieldset>
          <input type="hidden" {...register("suunnitteluVaihe.vuorovaikutus.julkinen")} />
        </form>
      </FormProvider>
      <PdfPreviewForm ref={pdfFormRef} />
      {openHyvaksy && (
        <HyvaksymisDialogi
          ilmoituksenVastaanottajat={ilmoituksenVastaanottajat}
          dialogiOnAuki={openHyvaksy}
          onClose={handleClickCloseHyvaksy}
          tallenna={saveForm}
          julkinen={!!vuorovaikutus?.julkinen}
        />
      )}
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
