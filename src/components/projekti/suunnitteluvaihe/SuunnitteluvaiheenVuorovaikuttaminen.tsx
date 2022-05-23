import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import SectionContent from "@components/layout/SectionContent";
import { KuntaVastaanottajaInput, LinkkiInput, VuorovaikutusTilaisuusInput, Kieli, Kielitiedot } from "../../../../common/graphql/apiModel";
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
import { UseFormReturn } from "react-hook-form";
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
// const omitDeep = require("omit-deep-lodash");

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

export type VuorovaikutusFormValues = RequiredProjektiFields & {
  suunnitteluVaihe: {
    vuorovaikutus: Pick<
      VuorovaikutusInput,
      | "aineistot"
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

type FormValuesForLuonnoksetJaAineistot = RequiredProjektiFields & {
  suunnitteluVaihe: {
    vuorovaikutus: Pick<VuorovaikutusInput, "vuorovaikutusNumero" | "videot" | "suunnittelumateriaali">;
  };
};

type FormValuesForEsitettavatYhteystiedot = RequiredProjektiFields & {
  suunnitteluVaihe: {
    vuorovaikutus: Pick<
      VuorovaikutusInput,
      "vuorovaikutusNumero" | "esitettavatYhteystiedot" | "vuorovaikutusYhteysHenkilot"
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

const defaultVastaanottajat = (
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
  const today = dayjs().format();
  const { t } = useTranslation();
  const pdfFormRef = useRef<HTMLFormElement | null>(null);

  const v = useMemo(() => {
    return projekti?.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
      return v.vuorovaikutusNumero === vuorovaikutusnro;
    });
  }, [projekti, vuorovaikutusnro]);

  const defaultValues: Omit<VuorovaikutusFormValues, "oid"> = useMemo(() => {
    return {
      suunnitteluVaihe: {
        vuorovaikutus: {
          vuorovaikutusNumero: vuorovaikutusnro,
          vuorovaikutusJulkaisuPaiva: v?.vuorovaikutusJulkaisuPaiva,
          kysymyksetJaPalautteetViimeistaan: v?.kysymyksetJaPalautteetViimeistaan,
          vuorovaikutusYhteysHenkilot:
            projekti?.kayttoOikeudet
              ?.filter(({ kayttajatunnus }) => v?.vuorovaikutusYhteysHenkilot?.includes(kayttajatunnus))
              .map(({ kayttajatunnus }) => kayttajatunnus) || [],
          esitettavatYhteystiedot: v?.esitettavatYhteystiedot?.map((yhteystieto) => removeTypeName(yhteystieto)) || [],
          ilmoituksenVastaanottajat: defaultVastaanottajat(projekti, vuorovaikutusnro, kirjaamoOsoitteet),
          vuorovaikutusTilaisuudet:
            v?.vuorovaikutusTilaisuudet?.map((tilaisuus) => {
              const { __typename, ...vuorovaikutusTilaisuusInput } = tilaisuus;
              const { esitettavatYhteystiedot } = vuorovaikutusTilaisuusInput;
              vuorovaikutusTilaisuusInput.esitettavatYhteystiedot =
                esitettavatYhteystiedot?.map((yt) => removeTypeName(yt)) || [];
              return vuorovaikutusTilaisuusInput;
            }) || [],
          julkinen: v?.julkinen,
          videot: defaultListWithEmptyLink(v?.videot as LinkkiInput[]),
          suunnittelumateriaali: (removeTypeName(v?.suunnittelumateriaali) as LinkkiInput) || { nimi: "", url: "" },
        },
      },
    };
  }, [projekti, vuorovaikutusnro, kirjaamoOsoitteet, v]);

  const formOptions: UseFormProps<VuorovaikutusFormValues> = useMemo(() => {
    return {
      resolver: yupResolver(vuorovaikutusSchema, { abortEarly: false, recursive: true }),
      mode: "onChange",
      reValidateMode: "onChange",
      defaultValues,
    };
  }, [defaultValues]);

  const useFormReturn = useForm<VuorovaikutusFormValues>(formOptions);
  const {
    register,
    reset,
    handleSubmit,
    formState: { isDirty },
    getValues,
  } = useFormReturn;

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

  if (!projekti || !v) {
    return <></>;
  }

  const ilmoituksenVastaanottajat = getValues("suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat");
  const vuorovaikutusTilaisuudet = getValues("suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet");

  const isVerkkotilaisuuksia = !!vuorovaikutusTilaisuudet?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA
  );
  const isFyysisiatilaisuuksia = !!vuorovaikutusTilaisuudet?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA
  );
  const isSoittoaikoja = !!vuorovaikutusTilaisuudet?.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA);
  const kielitiedot: Kielitiedot | null | undefined = projekti.kielitiedot;

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <fieldset>
            <Section className="mb-4">
              <SectionContent>
                <h3 className="vayla-small-title">Vuorovaikuttaminen</h3>
                <VuorovaikuttamisenInfo vuorovaikutus={v} />
              </SectionContent>
              <PaivamaaratJaTiedot projekti={projekti} vuorovaikutusnro={vuorovaikutusnro} />
            </Section>
            <VuorovaikutusMahdollisuudet projekti={projekti} vuorovaikutus={v} setOpenVuorovaikutustilaisuus={setOpenVuorovaikutustilaisuus} />
            <VuorovaikutustilaisuusDialog
              open={openVuorovaikutustilaisuus}
              windowHandler={(t: boolean) => {
                setOpenVuorovaikutustilaisuus(t);
              }}
              tilaisuudet={v?.vuorovaikutusTilaisuudet}
              kayttoOikeudet={projekti.kayttoOikeudet}
              julkinen={v?.julkinen || false}
              avaaHyvaksymisDialogi={() => setOpenHyvaksy(true)}
            />
            <LuonnoksetJaAineistot
              saveForm={saveForm}
              muokkaustila={aineistoMuokkaustila}
              setMuokkaustila={setAineistoMuokkaustila}
              vuorovaikutus={v}
              useFormReturn={useFormReturn as UseFormReturn<FormValuesForLuonnoksetJaAineistot, object>}
            />
            <EsitettavatYhteystiedot
              useFormReturn={useFormReturn as UseFormReturn<FormValuesForEsitettavatYhteystiedot, object>}
              projekti={projekti}
              vuorovaikutusnro={vuorovaikutusnro}
            />
            {v?.julkinen &&
              <LukutilaLinkkiJaKutsut vuorovaikutus={v} projekti={projekti} />
            }
            <IlmoituksenVastaanottajat kirjaamoOsoitteet={kirjaamoOsoitteet} vuorovaikutus={v} />
            {!v?.julkinen &&
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
            }
            {!v?.julkinen &&
              <Section noDivider>
                <Stack justifyContent={[undefined, undefined, "flex-end"]} direction={["column", "column", "row"]}>
                  {!v?.julkinen && <Button onClick={handleSubmit(saveDraft)}>Tallenna luonnos</Button>}
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
            }
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
        julkinen={v?.julkinen || false}
      />
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
