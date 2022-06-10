import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import SectionContent from "@components/layout/SectionContent";
import {
  KuntaVastaanottajaInput,
  LinkkiInput,
  Vuorovaikutus,
  Kieli,
  Kielitiedot,
} from "../../../../common/graphql/apiModel";
import {
  TallennaProjektiInput,
  Projekti,
  api,
  VuorovaikutusInput,
  ViranomaisVastaanottajaInput,
  IlmoitettavaViranomainen,
  IlmoituksenVastaanottajatInput,
} from "@services/api";
import Section from "@components/layout/Section";
import React, { ReactElement, useEffect, useState, useMemo, useCallback, useRef } from "react";
import Button from "@components/button/Button";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuSpinner from "@components/HassuSpinner";
import { KeyedMutator } from "swr";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { vuorovaikutusSchema } from "src/schemas/vuorovaikutus";
import HassuStack from "@components/layout/HassuStack";
import { Stack } from "@mui/material";
import HyvaksymisDialogi from "./HyvaksymisDialogi";
import EsitettavatYhteystiedot from "./EsitettavatYhteystiedot";
import LuonnoksetJaAineistot from "./LuonnoksetJaAineistot";
import IlmoituksenVastaanottajat from "./IlmoituksenVastaanottajat";
import { removeTypeName } from "src/util/removeTypeName";
import getIlmoitettavaViranomainen from "src/util/getIlmoitettavaViranomainen";
import VuorovaikuttamisenInfo from "./VuorovaikuttamisenInfo";
import PaivamaaratJaTiedot from "./PaivamaaratJaTiedot";
import LukutilaLinkkiJaKutsut from "./LukutilaLinkkiJaKutsut";
import VuorovaikutusMahdollisuudet from "./VuorovaikutusMahdollisuudet";
import VuorovaikutustilaisuusDialog from "./VuorovaikutustilaisuusDialog";
import cloneDeep from "lodash/cloneDeep";

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
      | "vuorovaikutusYhteysHenkilot"
      | "julkinen"
    >;
  };
};

interface Props {
  projekti?: Projekti | null;
  reloadProjekti?: KeyedMutator<ProjektiLisatiedolla | null>;
  isDirtyHandler: (isDirty: boolean) => void;
  vuorovaikutusnro: number;
  kirjaamoOsoitteet: ViranomaisVastaanottajaInput[] | null;
}

const defaultListWithEmptyLink = (list: LinkkiInput[] | null | undefined): LinkkiInput[] => {
  if (!list || !list.length) {
    return [{ url: "", nimi: "" }];
  }
  return list.map((link) => ({ nimi: link.nimi, url: link.url }));
};

export const defaultVastaanottajat = (
  projekti: Projekti | null | undefined,
  vuorovaikutusnro: number,
  kirjaamoOsoitteet: ViranomaisVastaanottajaInput[] | null
): IlmoituksenVastaanottajatInput => {
  const v = projekti?.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
    return v.vuorovaikutusNumero === vuorovaikutusnro;
  });
  let kunnat: KuntaVastaanottajaInput[];
  let viranomaiset: ViranomaisVastaanottajaInput[];
  if (v?.ilmoituksenVastaanottajat?.kunnat) {
    kunnat = v?.ilmoituksenVastaanottajat?.kunnat.map((kunta) => {
      kunta = removeTypeName(kunta);
      delete kunta.lahetetty;
      return kunta;
    });
  } else {
    kunnat =
      projekti?.velho?.kunnat?.map((s) => {
        return {
          nimi: s,
          sahkoposti: "",
        } as KuntaVastaanottajaInput;
      }) || [];
  }
  if (v?.ilmoituksenVastaanottajat?.viranomaiset) {
    viranomaiset = v?.ilmoituksenVastaanottajat?.viranomaiset.map((kunta) => {
      kunta = removeTypeName(kunta);
      delete kunta.lahetetty;
      return kunta;
    });
  } else {
    viranomaiset =
      projekti?.velho?.suunnittelustaVastaavaViranomainen === "VAYLAVIRASTO"
        ? projekti?.velho?.maakunnat?.map((maakunta) => {
            const ely: IlmoitettavaViranomainen = getIlmoitettavaViranomainen(maakunta);
            return (
              kirjaamoOsoitteet?.find((osoite) => osoite.nimi == ely) ||
              ({ nimi: maakunta, sahkoposti: "" } as ViranomaisVastaanottajaInput)
            );
          }) || []
        : [
            kirjaamoOsoitteet?.find((osoite) => osoite.nimi == "VAYLAVIRASTO") ||
              ({ nimi: "VAYLAVIRASTO" as IlmoitettavaViranomainen, sahkoposti: "" } as ViranomaisVastaanottajaInput),
          ];
  }
  return {
    kunnat,
    viranomaiset,
  };
};

const defaultVuorovaikutus: Vuorovaikutus = {
  __typename: "Vuorovaikutus",
  vuorovaikutusNumero: 1,
};

export default function SuunnitteluvaiheenVuorovaikuttaminen({
  projekti,
  reloadProjekti,
  isDirtyHandler,
  vuorovaikutusnro,
  kirjaamoOsoitteet,
}: Props): ReactElement {
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [openHyvaksy, setOpenHyvaksy] = useState(false);
  const [openVuorovaikutustilaisuus, setOpenVuorovaikutustilaisuus] = useState(false);
  const [aineistoMuokkaustila, setAineistoMuokkaustila] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const [serializedFormData, setSerializedFormData] = useState("{}");
  const pdfFormRef = useRef<HTMLFormElement | null>(null);
  const [formContext, setFormContext] = useState<VuorovaikutusFormValues>();

  const vuorovaikutus = useMemo(
    () =>
      projekti?.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
        return v.vuorovaikutusNumero === vuorovaikutusnro;
      }) || defaultVuorovaikutus,
    [projekti, vuorovaikutusnro]
  );

  const defaultValues: Omit<VuorovaikutusFormValues, "oid"> = useMemo(() => {
    return {
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
          vuorovaikutusJulkaisuPaiva: vuorovaikutus?.vuorovaikutusJulkaisuPaiva,
          kysymyksetJaPalautteetViimeistaan: vuorovaikutus?.kysymyksetJaPalautteetViimeistaan,
          vuorovaikutusYhteysHenkilot:
            projekti?.kayttoOikeudet
              ?.filter(({ kayttajatunnus }) => vuorovaikutus?.vuorovaikutusYhteysHenkilot?.includes(kayttajatunnus))
              .map(({ kayttajatunnus }) => kayttajatunnus) || [],
          esitettavatYhteystiedot:
            vuorovaikutus?.esitettavatYhteystiedot?.map((yhteystieto) => removeTypeName(yhteystieto)) || [],
          ilmoituksenVastaanottajat: { kunnat: [], viranomaiset: [] },
          vuorovaikutusTilaisuudet:
            vuorovaikutus?.vuorovaikutusTilaisuudet?.map((tilaisuus) => {
              const { __typename, ...vuorovaikutusTilaisuusInput } = tilaisuus;
              const { esitettavatYhteystiedot } = vuorovaikutusTilaisuusInput;
              vuorovaikutusTilaisuusInput.esitettavatYhteystiedot =
                esitettavatYhteystiedot?.map((yt) => removeTypeName(yt)) || [];
              return vuorovaikutusTilaisuusInput;
            }) || [],
          julkinen: vuorovaikutus?.julkinen,
          videot: defaultListWithEmptyLink(vuorovaikutus?.videot as LinkkiInput[]),
          suunnittelumateriaali: (removeTypeName(vuorovaikutus?.suunnittelumateriaali) as LinkkiInput) || {
            nimi: "",
            url: "",
          },
        },
      },
    };
  }, [projekti, vuorovaikutusnro, vuorovaikutus]);

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

  const updateFormContext = useCallback(() => {
    setFormContext(getValues());
  }, [setFormContext, getValues]);

  const saveSunnitteluvaihe = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      setIsFormSubmitting(true);
      await api.tallennaProjekti(formData);
      if (reloadProjekti) await reloadProjekti();
    },
    [setIsFormSubmitting, reloadProjekti]
  );

  const saveDraft = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      console.log(formData);
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

  const showPDFPreview = useCallback(
    (formData: TallennaProjektiInput, action: string, kieli: Kieli) => {
      const formDataToSend = cloneDeep(formData);
      setSerializedFormData(JSON.stringify(formDataToSend));
      if (pdfFormRef.current) {
        pdfFormRef.current.action = action + "?kieli=" + kieli;
        pdfFormRef.current?.submit();
      }
    },
    [setSerializedFormData, pdfFormRef]
  );

  useEffect(() => {
    isDirtyHandler(isDirty);
  }, [isDirty, isDirtyHandler]);

  useEffect(() => {
    if (projekti && projekti.oid) {
      const tallentamisTiedot: VuorovaikutusFormValues = {
        oid: projekti.oid,
        ...defaultValues,
      };
      reset(tallentamisTiedot);
    }
  }, [projekti, defaultValues, reset]);

  const handleClickOpenHyvaksy = () => {
    setOpenHyvaksy(true);
  };

  const handleClickCloseHyvaksy = () => {
    setOpenHyvaksy(false);
  };

  if (!projekti) {
    return <></>;
  }

  const ilmoituksenVastaanottajat = getValues("suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat");
  const kielitiedot: Kielitiedot | null | undefined = projekti.kielitiedot;

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
            {!vuorovaikutus?.julkinen && (
              <Section>
                <h4 className="vayla-small-title">Kutsun ja ilmoituksen esikatselu</h4>
                <SectionContent>
                  <HassuStack direction={["column", "column", "row"]}>
                    <Button
                      type="submit"
                      onClick={handleSubmit((formData) =>
                        showPDFPreview(
                          formData,
                          `/api/projekti/${projekti?.oid}/suunnittelu/kutsu/pdf`,
                          kielitiedot?.ensisijainenKieli || Kieli.SUOMI
                        )
                      )}
                    >
                      Kutsun esikatselu
                    </Button>
                    <Button
                      type="submit"
                      onClick={handleSubmit((formData) =>
                        showPDFPreview(
                          formData,
                          `/api/projekti/${projekti?.oid}/suunnittelu/ilmoitus/pdf`,
                          kielitiedot?.ensisijainenKieli || Kieli.SUOMI
                        )
                      )}
                      disabled
                    >
                      Ilmoituksen esikatselu
                    </Button>
                  </HassuStack>
                </SectionContent>
              </Section>
            )}
            {!vuorovaikutus?.julkinen && (
              <Section noDivider>
                <Stack justifyContent={[undefined, undefined, "flex-end"]} direction={["column", "column", "row"]}>
                  <Button onClick={handleSubmit(saveDraft)}>Tallenna luonnos</Button>
                  <Button
                    primary
                    onClick={(event) => {
                      handleClickOpenHyvaksy();
                      event.preventDefault();
                    }}
                  >
                    Tallenna julkaistavaksi
                  </Button>
                </Stack>
              </Section>
            )}
          </fieldset>
          <input type="hidden" {...register("suunnitteluVaihe.vuorovaikutus.julkinen")} />
        </form>
      </FormProvider>
      <form ref={pdfFormRef} target="_blank" method="POST">
        <input type="hidden" name="tallennaProjektiInput" value={serializedFormData} />
      </form>
      <HyvaksymisDialogi
        ilmoituksenVastaanottajat={ilmoituksenVastaanottajat}
        dialogiOnAuki={openHyvaksy}
        onClose={handleClickCloseHyvaksy}
        tallenna={saveForm}
        julkinen={!!vuorovaikutus?.julkinen}
      />
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
