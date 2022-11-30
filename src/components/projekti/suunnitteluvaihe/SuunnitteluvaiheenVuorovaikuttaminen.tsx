import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import SectionContent from "@components/layout/SectionContent";
import {
  TallennaProjektiInput,
  VuorovaikutusTilaisuusInput,
  LinkkiInput,
  AsiakirjaTyyppi,
  KirjaamoOsoite,
  Yhteystieto,
  KayttajaTyyppi,
  ProjektiKayttaja,
  VuorovaikutusKierrosInput,
  VuorovaikutusTilaisuus,
  VuorovaikutusKierros,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
} from "@services/api";
import Section from "@components/layout/Section";
import React, { ReactElement, useState, useMemo, useCallback } from "react";
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
import { removeTypeName, removeTypeNamesFromArray } from "src/util/removeTypeName";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import VuorovaikuttamisenInfo from "./VuorovaikuttamisenInfo";
import PaivamaaratJaTiedot from "./PaivamaaratJaTiedot";
import VuorovaikutusMahdollisuudet from "./VuorovaikutusMahdollisuudet";
import VuorovaikutustilaisuusDialog from "./VuorovaikutustilaisuusDialog";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import PdfPreviewForm from "../PdfPreviewForm";
import { lowerCase } from "lodash";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import projektiKayttajaToYhteystieto from "src/util/kayttajaTransformationUtil";
import useApi from "src/hooks/useApi";

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;

export type VuorovaikutusFormValues = ProjektiFields & {
  vuorovaikutusKierros: Pick<
    VuorovaikutusKierrosInput,
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
  >;
};

interface Props {
  vuorovaikutusnro: number;
}

const defaultListWithEmptyLink = (list: LinkkiInput[] | null | undefined): LinkkiInput[] => {
  if (!list || !list.length) {
    return [{ url: "", nimi: "" }];
  }
  return list.map((link) => ({ nimi: link.nimi, url: link.url }));
};

const defaultVuorovaikutus: VuorovaikutusKierros = {
  __typename: "VuorovaikutusKierros",
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
  const formContext: { projekti: ProjektiLisatiedolla } = useMemo(() => ({ projekti }), [projekti]);

  const vuorovaikutusKierros: VuorovaikutusKierros = useMemo(() => projekti?.vuorovaikutusKierros || defaultVuorovaikutus, [projekti]);
  const defaultValues: VuorovaikutusFormValues = useMemo(() => {
    return {
      oid: projekti.oid,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: vuorovaikutusnro,
        esittelyaineistot:
          vuorovaikutusKierros?.esittelyaineistot?.map(({ dokumenttiOid, nimi }) => ({
            dokumenttiOid,
            nimi,
          })) || [],
        suunnitelmaluonnokset:
          vuorovaikutusKierros?.suunnitelmaluonnokset?.map(({ dokumenttiOid, nimi }) => ({
            dokumenttiOid,
            nimi,
          })) || [],

        vuorovaikutusJulkaisuPaiva: vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva || null,
        kysymyksetJaPalautteetViimeistaan: vuorovaikutusKierros?.kysymyksetJaPalautteetViimeistaan || null,
        esitettavatYhteystiedot: {
          yhteysTiedot: removeTypeNamesFromArray(vuorovaikutusKierros?.esitettavatYhteystiedot?.yhteysTiedot) || [],
          yhteysHenkilot: vuorovaikutusKierros?.esitettavatYhteystiedot?.yhteysHenkilot || [],
        },
        ilmoituksenVastaanottajat: defaultVastaanottajat(projekti, vuorovaikutusKierros?.ilmoituksenVastaanottajat, kirjaamoOsoitteet),
        vuorovaikutusTilaisuudet:
          vuorovaikutusKierros?.vuorovaikutusTilaisuudet?.map((tilaisuus: VuorovaikutusTilaisuus) => {
            const { __typename, esitettavatYhteystiedot, peruttu, ...rest } = tilaisuus;
            const vuorovaikutusTilaisuusInput: VuorovaikutusTilaisuusInput = {
              ...rest,
              esitettavatYhteystiedot: {
                yhteysHenkilot: esitettavatYhteystiedot?.yhteysHenkilot || [],
                yhteysTiedot: removeTypeNamesFromArray(esitettavatYhteystiedot?.yhteysTiedot) || [],
              },
            };
            return vuorovaikutusTilaisuusInput;
          }) || [],
        videot: defaultListWithEmptyLink(vuorovaikutusKierros?.videot as LinkkiInput[]),
        suunnittelumateriaali: (removeTypeName(vuorovaikutusKierros?.suunnittelumateriaali) as LinkkiInput) || {
          nimi: "",
          url: "",
        },
      },
    };
  }, [projekti, vuorovaikutusnro, vuorovaikutusKierros, kirjaamoOsoitteet]);

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
    reset,
    handleSubmit,
    formState: { isDirty },
    getValues,
    watch,
  } = useFormReturn;

  const vuorovaikutustilaisuudet = watch("vuorovaikutusKierros.vuorovaikutusTilaisuudet");

  useLeaveConfirm(isDirty);

  const api = useApi();

  const saveSunnitteluvaihe = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      setIsFormSubmitting(true);
      await api.tallennaProjekti(formData);
      if (reloadProjekti) await reloadProjekti();
      reset(formData);
    },
    [api, reloadProjekti, reset]
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

  const vaihdaKierroksenTila = useCallback(
    async (toiminto: TilasiirtymaToiminto, viesti: string, syy?: string) => {
      let mounted = true;
      if (!projekti) {
        return;
      }
      setIsFormSubmitting(true);
      try {
        await api.siirraTila({ oid: projekti.oid, toiminto, syy, tyyppi: TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS });
        await reloadProjekti();
        showSuccessMessage(`${viesti} onnistui`);
      } catch (error) {
        log.error(error);
        showErrorMessage("Toiminnossa tapahtui virhe");
      }
      if (mounted) {
        setIsFormSubmitting(false);
        setOpenHyvaksy(false);
      }
      return () => (mounted = false);
    },
    [setIsFormSubmitting, reloadProjekti, showSuccessMessage, showErrorMessage, projekti]
  );

  const saveAndPublish = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      let mounted = true;
      log.debug("tallenna tiedot ja lähetä hyväksyttäväksi");
      setIsFormSubmitting(true);
      try {
        await saveDraft(formData);
        await vaihdaKierroksenTila(TilasiirtymaToiminto.HYVAKSY, "Hyvaksy");
      } catch (error) {
        log.error("Virhe hyväksyntään lähetyksessä", error);
        showErrorMessage("Hyväksyntään lähetyksessä tapahtui virhe");
      }
      if (mounted) {
        setIsFormSubmitting(false);
        setOpenHyvaksy(false);
      }
      return () => (mounted = false);
    },
    [setIsFormSubmitting, saveDraft, setOpenHyvaksy, vaihdaKierroksenTila, showErrorMessage]
  );

  const saveForm = useMemo(() => {
    return handleSubmit(saveAndPublish);
  }, [handleSubmit, saveAndPublish]);

  const handleClickOpenHyvaksy = () => {
    setOpenHyvaksy(true);
  };

  const handleClickCloseHyvaksy = () => {
    setOpenHyvaksy(false);
  };

  const ilmoituksenVastaanottajat = getValues("vuorovaikutusKierros.ilmoituksenVastaanottajat");

  const ensisijainenKieli = projekti.kielitiedot?.ensisijainenKieli;
  const toissijainenKieli = projekti.kielitiedot?.toissijainenKieli;
  const esikatselePdf = pdfFormRef.current?.esikatselePdf;

  const projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[] = useMemo(() => {
    const kunnanEdustaja = projekti?.kayttoOikeudet?.find((hlo) => hlo.kayttajatunnus === projekti.suunnitteluSopimus?.yhteysHenkilo);
    const projari = projekti?.kayttoOikeudet?.find((hlo) => hlo.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);
    const arr: ProjektiKayttaja[] = [];
    if (kunnanEdustaja) {
      arr.push(kunnanEdustaja);
      projekti?.kayttoOikeudet?.forEach((hlo) => {
        if (hlo.kayttajatunnus !== projekti.suunnitteluSopimus?.yhteysHenkilo) {
          arr.push(hlo);
        }
      });
    } else {
      arr.push(projari as ProjektiKayttaja);
      projekti?.kayttoOikeudet?.forEach((hlo) => {
        if (hlo.tyyppi !== KayttajaTyyppi.PROJEKTIPAALLIKKO) {
          arr.push(hlo);
        }
      });
    }
    return arr.map((hlo) => ({ kayttajatunnus: hlo.kayttajatunnus, ...projektiKayttajaToYhteystieto(hlo, projekti?.suunnitteluSopimus) }));
  }, [projekti]);

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <fieldset>
            <Section className="mb-4">
              <SectionContent>
                <h3 className="vayla-small-title">Vuorovaikuttaminen</h3>
                <VuorovaikuttamisenInfo vuorovaikutus={vuorovaikutusKierros} eiOleJulkaistu={true} />
              </SectionContent>
              <PaivamaaratJaTiedot />
            </Section>
            <VuorovaikutusMahdollisuudet julkaistu={false} setOpenVuorovaikutustilaisuus={setOpenVuorovaikutustilaisuus} />
            <VuorovaikutustilaisuusDialog
              open={openVuorovaikutustilaisuus}
              windowHandler={(t: boolean) => {
                setOpenVuorovaikutustilaisuus(t);
              }}
              tilaisuudet={vuorovaikutustilaisuudet}
              projektiHenkilot={projektiHenkilot}
              julkinen={false}
              avaaHyvaksymisDialogi={() => setOpenHyvaksy(true)}
            />
            <LuonnoksetJaAineistot
              saveForm={saveForm}
              muokkaustila={aineistoMuokkaustila}
              setMuokkaustila={setAineistoMuokkaustila}
              vuorovaikutus={vuorovaikutusKierros}
              julkinen={false}
            />
            <EsitettavatYhteystiedot projektiHenkilot={projektiHenkilot} />
            <IlmoituksenVastaanottajat kirjaamoOsoitteet={kirjaamoOsoitteet} vuorovaikutus={vuorovaikutusKierros} />
            {!!esikatselePdf && (
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
          julkinen={false}
        />
      )}
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
