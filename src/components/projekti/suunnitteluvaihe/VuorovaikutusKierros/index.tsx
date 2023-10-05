import { FieldPath, FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import SectionContent from "@components/layout/SectionContent";
import {
  AsiakirjaTyyppi,
  Kieli,
  KirjaamoOsoite,
  KuulutusJulkaisuTila,
  TallennaProjektiInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VuorovaikutusKierros,
  VuorovaikutusKierrosInput,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusInput,
  Yhteystieto,
} from "@services/api";
import Section from "@components/layout/Section";
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import Button from "@components/button/Button";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuSpinner from "@components/HassuSpinner";
import { vuorovaikutusSchema } from "src/schemas/vuorovaikutus";
import HassuStack from "@components/layout/HassuStack";
import { Stack } from "@mui/material";
import HyvaksymisDialogi from "./HyvaksymisDialogi";
import EsitettavatYhteystiedot from "./EsitettavatYhteystiedot";
import IlmoituksenVastaanottajat from "./IlmoituksenVastaanottajat";
import { removeTypeName } from "src/util/removeTypeName";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import VuorovaikutusMahdollisuudet from "./VuorovaikutusMahdollisuudet";
import VuorovaikutustilaisuusDialog from "./VuorovaikutustilaisuusDialog";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import PdfPreviewForm from "../../PdfPreviewForm";
import lowerCase from "lodash/lowerCase";
import pickBy from "lodash/pickBy";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import Julkaisupaiva from "./Julkaisupaiva";
import useProjektiHenkilot from "src/hooks/useProjektiHenkilot";
import useApi from "src/hooks/useApi";
import HankkeenSisallonKuvaus from "./HankkeenSisallonKuvaus";
import defaultEsitettavatYhteystiedot from "src/util/defaultEsitettavatYhteystiedot";
import { isKieliTranslatable } from "hassu-common/kaannettavatKielet";
import PohjoissaamenkielinenKutsuInput from "@components/projekti/suunnitteluvaihe/VuorovaikutusKierros/PohjoissaamenkielinenKutsuInput";
import { isPohjoissaameSuunnitelma } from "../../../../util/isPohjoissaamiSuunnitelma";
import { ValidationError } from "yup";
import KierroksenPoistoDialogi from "../KierroksenPoistoDialogi";
import { lataaTiedosto } from "../../../../util/fileUtil";
import SelosteVuorovaikutuskierrokselle from "@components/projekti/suunnitteluvaihe/VuorovaikutusKierros/SelosteVuorovaikutuskierrokselle";

type ProjektiFields = Pick<TallennaProjektiInput, "oid" | "versio">;

export type VuorovaikutusFormValues = ProjektiFields & {
  vuorovaikutusKierros: Pick<
    VuorovaikutusKierrosInput,
    | "vuorovaikutusNumero"
    | "vuorovaikutusJulkaisuPaiva"
    | "hankkeenKuvaus"
    | "vuorovaikutusTilaisuudet"
    | "esitettavatYhteystiedot"
    | "ilmoituksenVastaanottajat"
    | "vuorovaikutusSaamePDFt"
    | "selosteVuorovaikutuskierrokselle"
  >;
};

interface Props {
  vuorovaikutusnro: number;
}

const defaultVuorovaikutus: VuorovaikutusKierros = {
  __typename: "VuorovaikutusKierros",
  vuorovaikutusNumero: 1,
};

export default function VuorovaikutusKierrosKutsuWrapper(props: Props): ReactElement {
  const { data: projekti, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();
  return (
    <>{projekti && kirjaamoOsoitteet && <VuorovaikutusKierrosKutsu {...props} {...{ projekti, reloadProjekti, kirjaamoOsoitteet }} />}</>
  );
}

type SuunnitteluvaiheenVuorovaikuttaminenFormProps = {
  projekti: ProjektiLisatiedolla;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
  kirjaamoOsoitteet: KirjaamoOsoite[];
} & Props;

function VuorovaikutusKierrosKutsu({
  vuorovaikutusnro,
  projekti,
  reloadProjekti,
  kirjaamoOsoitteet,
}: SuunnitteluvaiheenVuorovaikuttaminenFormProps): ReactElement {
  const api = useApi();

  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [openHyvaksy, setOpenHyvaksy] = useState(false);
  const [openVuorovaikutustilaisuus, setOpenVuorovaikutustilaisuus] = useState(false);
  const [openPoistoDialogi, setOpenPoistoDialogi] = useState(false);

  const { showSuccessMessage } = useSnackbars();
  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  const vuorovaikutusKierros: VuorovaikutusKierros = useMemo(() => projekti?.vuorovaikutusKierros ?? defaultVuorovaikutus, [projekti]);
  const defaultValues: VuorovaikutusFormValues = useMemo(() => {
    const { ensisijainenKieli, toissijainenKieli } = projekti.kielitiedot ?? {};

    const hasRuotsinKieli = ensisijainenKieli === Kieli.RUOTSI || toissijainenKieli === Kieli.RUOTSI;

    const hankkeenKuvausHasBeenCreated = !!projekti.vuorovaikutusKierros?.hankkeenKuvaus;

    // SUOMI hankkeen kuvaus on aina lomakkeella, RUOTSI vain jos kyseinen kieli on projektin kielitiedoissa.
    // Jos kieli ei ole kielitiedoissa kyseisen kielen kenttää ei tule lisätä hankkeenKuvaus olioon
    // Tästä syystä pickBy:llä poistetaan undefined hankkeenkuvaus tiedot.
    const hankkeenKuvaus: VuorovaikutusFormValues["vuorovaikutusKierros"]["hankkeenKuvaus"] = hankkeenKuvausHasBeenCreated
      ? {
          SUOMI: projekti.vuorovaikutusKierros?.hankkeenKuvaus?.SUOMI ?? "",
          ...pickBy(
            {
              RUOTSI: hasRuotsinKieli ? projekti.vuorovaikutusKierros?.hankkeenKuvaus?.RUOTSI ?? "" : undefined,
            },
            (value) => value !== undefined
          ),
        }
      : {
          SUOMI: projekti.aloitusKuulutus?.hankkeenKuvaus?.SUOMI ?? "",
          ...pickBy(
            {
              RUOTSI: hasRuotsinKieli ? projekti.aloitusKuulutus?.hankkeenKuvaus?.RUOTSI ?? "" : undefined,
            },
            (value) => value !== undefined
          ),
        };

    const formData: VuorovaikutusFormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: vuorovaikutusnro,
        vuorovaikutusJulkaisuPaiva: vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva ?? null,
        hankkeenKuvaus: hankkeenKuvaus,
        esitettavatYhteystiedot: defaultEsitettavatYhteystiedot(vuorovaikutusKierros.esitettavatYhteystiedot),
        ilmoituksenVastaanottajat: defaultVastaanottajat(projekti, vuorovaikutusKierros?.ilmoituksenVastaanottajat, kirjaamoOsoitteet),
        vuorovaikutusTilaisuudet:
          vuorovaikutusKierros?.vuorovaikutusTilaisuudet?.map((tilaisuus: VuorovaikutusTilaisuus) => {
            const { __typename, esitettavatYhteystiedot, peruttu, nimi, osoite, postitoimipaikka, lisatiedot, paikka, ...rest } = tilaisuus;
            const vuorovaikutusTilaisuusInput: VuorovaikutusTilaisuusInput = {
              ...rest,
              nimi: removeTypeName(nimi),
              osoite: removeTypeName(osoite),
              postitoimipaikka: removeTypeName(postitoimipaikka),
              lisatiedot: removeTypeName(lisatiedot),
              paikka: removeTypeName(paikka),
              esitettavatYhteystiedot: defaultEsitettavatYhteystiedot(esitettavatYhteystiedot),
            };
            return vuorovaikutusTilaisuusInput;
          }) ?? [],
        selosteVuorovaikutuskierrokselle: vuorovaikutusKierros?.selosteVuorovaikutuskierrokselle ?? null,
      },
    };

    if (isPohjoissaameSuunnitelma(projekti.kielitiedot)) {
      const pohjoissaamePdf = projekti.vuorovaikutusKierros?.vuorovaikutusSaamePDFt?.POHJOISSAAME?.tiedosto ?? null;
      formData.vuorovaikutusKierros.vuorovaikutusSaamePDFt = {
        POHJOISSAAME: pohjoissaamePdf,
      };
    }

    return formData;
  }, [projekti, vuorovaikutusnro, vuorovaikutusKierros, kirjaamoOsoitteet]);

  const formOptions: UseFormProps<VuorovaikutusFormValues> = useMemo(() => {
    return {
      resolver: yupResolver(vuorovaikutusSchema, { abortEarly: false, recursive: true }),
      mode: "onChange",
      reValidateMode: "onChange",
      defaultValues,
      context: { projekti },
    };
  }, [defaultValues, projekti]);

  const useFormReturn = useForm<VuorovaikutusFormValues>(formOptions);
  const {
    reset,
    handleSubmit,
    formState: { isDirty },
    getValues,
    watch,
    setError,
  } = useFormReturn;

  const vuorovaikutustilaisuudet = watch("vuorovaikutusKierros.vuorovaikutusTilaisuudet");

  useLeaveConfirm(isDirty);

  const talletaTiedosto = useCallback(async (tiedosto: File) => lataaTiedosto(api, tiedosto), [api]);

  const saveSuunnitteluvaihe = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      setIsFormSubmitting(true);
      await api.tallennaProjekti(formData);
      if (reloadProjekti) {
        await reloadProjekti();
      }
    },
    [api, reloadProjekti]
  );

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const saveDraft = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      setIsFormSubmitting(true);
      try {
        const pohjoisSaameKutsuPdf = formData.vuorovaikutusKierros.vuorovaikutusSaamePDFt?.POHJOISSAAME as unknown as
          | File
          | undefined
          | string;
        if (formData.vuorovaikutusKierros.vuorovaikutusSaamePDFt?.POHJOISSAAME && pohjoisSaameKutsuPdf instanceof File) {
          formData.vuorovaikutusKierros.vuorovaikutusSaamePDFt.POHJOISSAAME = await talletaTiedosto(pohjoisSaameKutsuPdf);
        }
        await saveSuunnitteluvaihe(formData);
        showSuccessMessage("Tallennus onnistui!");
      } catch (e) {
        log.error("OnSubmit Error", e);
      }
      setIsFormSubmitting(false);
    },
    [saveSuunnitteluvaihe, showSuccessMessage, talletaTiedosto]
  );

  const vaihdaKierroksenTila = useCallback(
    async (toiminto: TilasiirtymaToiminto, viesti: string) => {
      let mounted = true;
      if (!projekti) {
        return;
      }
      setIsFormSubmitting(true);
      try {
        await api.siirraTila({ oid: projekti.oid, toiminto, tyyppi: TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS });
        await reloadProjekti();
        showSuccessMessage(`${viesti} onnistui`);
      } catch (error) {
        log.error(error);
      }
      if (mounted) {
        setIsFormSubmitting(false);
        setOpenHyvaksy(false);
      }
      return () => (mounted = false);
    },
    [projekti, api, reloadProjekti, showSuccessMessage]
  );

  const saveAndPublish = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      let mounted = true;
      log.debug("tallenna tiedot ja lähetä hyväksyttäväksi");
      setIsFormSubmitting(true);

      try {
        await saveDraft(formData);
        await vaihdaKierroksenTila(TilasiirtymaToiminto.HYVAKSY, "Hyväksyminen");
      } catch (error) {
        log.error("Virhe hyväksyntään lähetyksessä", error);
      }
      if (mounted) {
        setIsFormSubmitting(false);
        setOpenHyvaksy(false);
      }
      return () => (mounted = false);
    },
    [saveDraft, vaihdaKierroksenTila]
  );

  const confirmPoista = () => {
    setOpenPoistoDialogi(true);
  };

  const saveForm = useMemo(() => {
    return handleSubmit(saveAndPublish);
  }, [handleSubmit, saveAndPublish]);

  const handleClickOpenHyvaksy = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      try {
        await vuorovaikutusSchema.validate(formData, {
          context: { projekti, applyLahetaHyvaksyttavaksiChecks: true },
          abortEarly: false,
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          const errorArray = error.inner.length ? error.inner : [error];
          errorArray.forEach((err) => {
            const { type, path, message } = err;
            if (path) {
              setError(path as FieldPath<VuorovaikutusFormValues>, { type, message });
            }
          });
        }
        return;
      }
      setOpenHyvaksy(true);
    },
    [projekti, setError]
  );

  const handleClickCloseHyvaksy = () => {
    setOpenHyvaksy(false);
  };

  const ilmoituksenVastaanottajat = getValues("vuorovaikutusKierros.ilmoituksenVastaanottajat");

  const ensisijainenKieli = projekti.kielitiedot?.ensisijainenKieli;
  const toissijainenKieli = projekti.kielitiedot?.toissijainenKieli;
  const esikatselePdf = pdfFormRef.current?.esikatselePdf;

  const projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[] = useProjektiHenkilot(projekti);

  const poistaKierros = useCallback(async () => {
    let mounted = true;
    if (!projekti) {
      return;
    }
    setIsFormSubmitting(true);
    try {
      await api.siirraTila({
        oid: projekti.oid,
        toiminto: TilasiirtymaToiminto.HYLKAA,
        tyyppi: TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS,
        syy: "Poistetaan luonnos",
      });
      await reloadProjekti();
      showSuccessMessage(`Luonnoksen poistaminen onnistui`);
    } catch (error) {
      log.error(error);
    }
    if (mounted) {
      setIsFormSubmitting(false);
      setOpenPoistoDialogi(false);
    }
    return () => (mounted = false);
  }, [api, projekti, reloadProjekti, showSuccessMessage]);

  const kuntavastaanottajat = watch("vuorovaikutusKierros.ilmoituksenVastaanottajat.kunnat");
  const kunnatPuuttuu = !(kuntavastaanottajat && kuntavastaanottajat.length > 0);

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <fieldset>
            <Section>
              <h3 className="vayla-subtitle">Kutsu vuorovaikutukseen</h3>
              <p>
                Tällä välilehdellä luodaan kutsu suunnitelman vuorovaikutukseen. Kutsussa näkyy tieto vuorovaikutustilaisuuksista, linkki
                järjestelmän julkisella puolelle esiteltäviin suunnitelmaluonnoksiin ja -aineistoihin sekä yhteyshenkilöt.
              </p>
              <Julkaisupaiva />
            </Section>
            <HankkeenSisallonKuvaus kielitiedot={projekti.kielitiedot} />
            <VuorovaikutusMahdollisuudet projekti={projekti} setOpenVuorovaikutustilaisuus={setOpenVuorovaikutustilaisuus} />
            <VuorovaikutustilaisuusDialog
              open={openVuorovaikutustilaisuus}
              windowHandler={(t: boolean) => {
                setOpenVuorovaikutustilaisuus(t);
              }}
              tilaisuudet={vuorovaikutustilaisuudet}
              projektiHenkilot={projektiHenkilot}
            />
            <EsitettavatYhteystiedot projektiHenkilot={projektiHenkilot} />
            <IlmoituksenVastaanottajat kirjaamoOsoitteet={kirjaamoOsoitteet} vuorovaikutus={vuorovaikutusKierros} />
            {!!vuorovaikutusKierros?.vuorovaikutusNumero && vuorovaikutusKierros.vuorovaikutusNumero > 1 && (
              <SelosteVuorovaikutuskierrokselle />
            )}
            {
              <Section>
                <h4 className="vayla-small-title">Kutsun esikatselu</h4>
                <SectionContent largeGaps>
                  {isKieliTranslatable(ensisijainenKieli) && (
                    <>
                      <p>Esikatsele tiedostot ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
                      <HassuStack direction={["column", "column", "row"]}>
                        <Button
                          type="submit"
                          id={`preview_kutsu_pdf_${ensisijainenKieli}`}
                          onClick={handleSubmit((formData) =>
                            esikatselePdf?.(formData, AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU, ensisijainenKieli)
                          )}
                        >
                          Kutsun esikatselu
                        </Button>
                      </HassuStack>
                    </>
                  )}
                  {isKieliTranslatable(toissijainenKieli) && (
                    <>
                      <p>Esikatsele tiedostot toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
                      <HassuStack direction={["column", "column", "row"]}>
                        <Button
                          type="submit"
                          id={`preview_kutsu_pdf_${toissijainenKieli}`}
                          onClick={handleSubmit((formData) =>
                            esikatselePdf?.(formData, AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU, toissijainenKieli)
                          )}
                        >
                          Kutsun esikatselu
                        </Button>
                      </HassuStack>
                    </>
                  )}
                  {isPohjoissaameSuunnitelma(projekti.kielitiedot) && (
                    <PohjoissaamenkielinenKutsuInput kutsuTiedot={projekti.vuorovaikutusKierros?.vuorovaikutusSaamePDFt?.POHJOISSAAME} />
                  )}
                </SectionContent>
              </Section>
            }
            <Section noDivider>
              <Stack justifyContent="space-between" flexDirection="row" flexWrap="wrap">
                {projekti.vuorovaikutusKierros?.vuorovaikutusNumero && projekti.vuorovaikutusKierros.vuorovaikutusNumero > 1 && (
                  <Stack justifyContent={[undefined, undefined, "flex-start"]} direction={["column", "column", "row"]}>
                    <Button
                      style={{ whiteSpace: "nowrap" }}
                      id="poista_luonnos"
                      onClick={(e) => {
                        e.preventDefault();
                        confirmPoista();
                      }}
                      disabled={isFormSubmitting}
                    >
                      Poista luonnos
                    </Button>
                  </Stack>
                )}
                <Stack justifyContent={[undefined, undefined, "flex-start"]} direction={["column", "column", "row"]} flexWrap="wrap">
                  <Button
                    id="save_suunnitteluvaihe_vuorovaikutukset_draft"
                    style={{ whiteSpace: "nowrap" }}
                    onClick={handleSubmit(saveDraft)}
                  >
                    Tallenna luonnos
                  </Button>
                  <Button
                    style={{ whiteSpace: "nowrap" }}
                    primary
                    id="save_and_publish"
                    onClick={handleSubmit(handleClickOpenHyvaksy)}
                    disabled={!canProjektiBePublished(projekti) || kunnatPuuttuu}
                  >
                    Tallenna julkaistavaksi
                  </Button>
                </Stack>
              </Stack>
            </Section>
          </fieldset>
        </form>
      </FormProvider>
      <PdfPreviewForm ref={pdfFormRef} />
      {openHyvaksy && (
        <HyvaksymisDialogi
          ilmoituksenVastaanottajat={ilmoituksenVastaanottajat}
          dialogiOnAuki={openHyvaksy}
          onClose={handleClickCloseHyvaksy}
          tallenna={saveForm}
        />
      )}
      <KierroksenPoistoDialogi
        openPoistoDialogi={openPoistoDialogi}
        setOpenPoistoDialogi={setOpenPoistoDialogi}
        poistaKierros={poistaKierros}
      />
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}

function canProjektiBePublished(projekti: ProjektiLisatiedolla): boolean {
  return projektiHasPublishedAloituskuulutusJulkaisu(projekti);
}

const projektiHasPublishedAloituskuulutusJulkaisu: (projekti: ProjektiLisatiedolla) => boolean = (projekti) =>
  !!(
    projekti.aloitusKuulutusJulkaisu?.tila &&
    [KuulutusJulkaisuTila.HYVAKSYTTY, KuulutusJulkaisuTila.MIGROITU].includes(projekti.aloitusKuulutusJulkaisu.tila)
  );
