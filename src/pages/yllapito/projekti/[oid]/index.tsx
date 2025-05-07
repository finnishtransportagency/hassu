import { useRouter } from "next/router";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import log from "loglevel";
import ProjektiPageLayout, { ProjektiPageLayoutContext } from "@components/projekti/ProjektiPageLayout";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import { Kieli, KielitiedotInput, LokalisoituTekstiInputEiPakollinen, Status, TallennaProjektiInput } from "@services/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import ProjektiSuunnittelusopimusTiedot from "@components/projekti/projektintiedot/ProjektiSunnittelusopimusTiedot";
import ProjektiEuRahoitusTiedot from "@components/projekti/ProjektiEuRahoitusTiedot";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import { maxNoteLength, perustiedotValidationSchema, UIValuesSchema } from "src/schemas/perustiedot";
import useSnackbars from "src/hooks/useSnackbars";
import ProjektiKuulutuskielet from "@components/projekti/ProjektiKuulutuskielet";
import Section from "@components/layout/Section2";
import HassuStack from "@components/layout/HassuStack";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import ProjektinTiedotLukutila from "@components/projekti/lukutila/ProjektinTiedotLukutila";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import PaivitaVelhoTiedotButton from "@components/projekti/PaivitaVelhoTiedotButton";
import useApi from "src/hooks/useApi";
import { lataaTiedosto } from "../../../../util/fileUtil";
import ProjektinPerusosio from "@components/projekti/perusosio/Perusosio";
import ContentSpacer from "@components/layout/ContentSpacer";
import { isKuulutusPublic } from "src/util/isKuulutusJulkaistu";
import Notification, { NotificationType } from "@components/notification/Notification";
import VahainenMenettelyOsio from "@components/projekti/projektintiedot/VahainenMenettelyOsio";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import AsianhallintaIntegraatioYhteys from "@components/projekti/projektintiedot/AsianhallintaIntegraatioYhteys";
import { OhjelistaNotification } from "@components/projekti/common/OhjelistaNotification";
import useCurrentUser from "src/hooks/useCurrentUser";
import LinkitetytProjektit from "@components/projekti/LinkitetytProjektit";
import { H3 } from "../../../../components/Headings";
import SuunnitelmaJaettuOsiin from "@components/projekti/SuunnitelmaJaettuOsiin";
import { MenuItem } from "@mui/material";
import ToiminnotMenuList from "@components/projekti/ToiminnotMenuList";
import { JaaProjektiOsiinDialog } from "@components/JaaProjektiOsiinDialog";
import { useShowTallennaProjektiMessage } from "src/hooks/useShowTallennaProjektiMessage";

type TransientFormValues = {
  suunnittelusopimusprojekti: "true" | "false" | null;
  kielitiedot: { ensisijainenKieli: Kieli | ""; toissijainenKieli: Kieli | ""; projektinNimiVieraskielella: string | null };
};
type PersitentFormValues = Pick<
  TallennaProjektiInput,
  | "oid"
  | "versio"
  | "muistiinpano"
  | "euRahoitus"
  | "euRahoitusLogot"
  | "suunnitteluSopimus"
  | "vahainenMenettely"
  | "asianhallinta"
  | "kustannuspaikka"
>;
export type FormValues = TransientFormValues & PersitentFormValues;

const loadedProjektiValidationSchema = getProjektiValidationSchema([
  ProjektiTestType.PROJEKTI_IS_LOADED,
  ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
  ProjektiTestType.PROJEKTI_HAS_ASIATUNNUS,
  ProjektiTestType.PROJEKTI_IS_CREATED,
]);

export default function ProjektiSivu() {
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });

  if (!projekti) {
    return <></>;
  }

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  return (
    <ProjektiPageLayout
      title={"Projektin tiedot"}
      showInfo={!epaaktiivinen}
      contentAsideTitle={<ContentAsideTitle epaaktiivinen={epaaktiivinen} projekti={projekti} reloadProjekti={reloadProjekti} />}
    >
      {epaaktiivinen ? (
        <ProjektinTiedotLukutila projekti={projekti} />
      ) : (
        <ProjektiSivuLomake {...{ projekti, projektiLoadError, reloadProjekti }} />
      )}
    </ProjektiPageLayout>
  );
}

interface ProjektiSivuLomakeProps {
  projekti: ProjektiLisatiedolla;
  projektiLoadError: any;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
}

function ContentAsideTitle({
  epaaktiivinen,
  projekti,
  reloadProjekti,
}: {
  epaaktiivinen: boolean;
  projekti: ProjektiLisatiedolla;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
}): JSX.Element {
  if (epaaktiivinen) {
    return <></>;
  }
  if (projekti.nykyinenKayttaja.onYllapitaja && projekti.projektinVoiJakaa) {
    return <YllapitajaMenu versio={projekti.versio} projektiOid={projekti.oid} reloadProjekti={reloadProjekti} />;
  }
  return <PaivitaVelhoTiedotButton projektiOid={projekti.oid} reloadProjekti={reloadProjekti} />;
}

function YllapitajaMenu({
  projektiOid,
  reloadProjekti,
  versio,
}: {
  projektiOid: string;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
  versio: number;
}): JSX.Element {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const open = useCallback(() => {
    setIsDialogOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsDialogOpen(false);
  }, []);
  const { withLoadingSpinner } = useLoadingSpinner();

  const { showSuccessMessage } = useSnackbars();
  const api = useApi();

  const paivitaTiedotVelhosta = useCallback(
    () =>
      withLoadingSpinner(
        (async () => {
          if (projektiOid) {
            try {
              await api.synkronoiProjektiMuutoksetVelhosta(projektiOid);
              await reloadProjekti();
              showSuccessMessage("Tiedot päivitetty Projektivelhosta");
            } catch (e) {
              log.log("reloadProjekti Error", e);
            }
          }
        })()
      ),
    [api, projektiOid, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  return (
    <>
      <ToiminnotMenuList>
        <MenuItem onClick={paivitaTiedotVelhosta}>Päivitä tiedot</MenuItem>
        <MenuItem onClick={open}>Jaa projekti osiin</MenuItem>
      </ToiminnotMenuList>
      {isDialogOpen && (
        <JaaProjektiOsiinDialog open={true} onClose={close} oid={projektiOid} reloadProjekti={reloadProjekti} versio={versio} />
      )}
    </>
  );
}

function ProjektiSivuLomake({ projekti, projektiLoadError, reloadProjekti }: ProjektiSivuLomakeProps) {
  const { data: nykyinenKayttaja } = useCurrentUser();
  const router = useRouter();

  const [statusBeforeSave, setStatusBeforeSave] = useState<Status | null | undefined>();
  const isLoadingProjekti = !projekti && !projektiLoadError;

  const { isLoading: formIsSubmitting, withLoadingSpinner } = useLoadingSpinner();

  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit = !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden || projektiHasErrors || isLoadingProjekti || formIsSubmitting;

  const defaultValues: FormValues = useMemo(() => {
    const { ensisijainenKieli, projektinNimiVieraskielella, toissijainenKieli } = projekti.kielitiedot ?? {};
    const vieraskielinen = [ensisijainenKieli, toissijainenKieli].some((kieli) => kieli === Kieli.POHJOISSAAME || kieli === Kieli.RUOTSI);
    const tallentamisTiedot: FormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      muistiinpano: projekti.muistiinpano ?? "",
      euRahoitus: !!projekti.euRahoitus,
      vahainenMenettely: !!projekti.vahainenMenettely,
      suunnittelusopimusprojekti:
        projekti.status === Status.EI_JULKAISTU_PROJEKTIN_HENKILOT ? null : projekti.suunnitteluSopimus ? "true" : "false",
      kustannuspaikka: projekti.kustannuspaikka,
      kielitiedot: {
        ensisijainenKieli: ensisijainenKieli ?? "",
        toissijainenKieli: toissijainenKieli ?? "",
        projektinNimiVieraskielella: vieraskielinen ? projektinNimiVieraskielella ?? "" : null,
      },
    };
    if (projekti.suunnitteluSopimus) {
      const { __typename, logo, osapuolet, ...suunnitteluSopimusInput } = projekti.suunnitteluSopimus as any;
      const { __typename: _t, ...logoInput } = logo || {};

      const muunnettuSuunnitteluSopimus = {
        ...suunnitteluSopimusInput,
        logo: logoInput,
        osapuoliMaara: osapuolet?.length || 0,
      };
      osapuolet?.forEach((osapuoli: any, index: number) => {
        const { __typename: osapuoliTypename, osapuolenHenkilot, osapuolenLogo, ...osapuoliTiedot } = osapuoli;
        const osapuoliNumero = index + 1;

        const { __typename: _logoTypename, ...osapuolenLogoInput } = osapuolenLogo || {};

        muunnettuSuunnitteluSopimus[`osapuoli${osapuoliNumero}`] = {
          ...osapuoliTiedot,
          osapuolenLogo: osapuolenLogoInput,
          osapuolenHenkilot:
            osapuolenHenkilot?.map((henkilo: any) => {
              const { __typename: henkiloTypename, ...henkiloTiedot } = henkilo;
              return henkiloTiedot;
            }) || [],
        };

        muunnettuSuunnitteluSopimus[`osapuoli${osapuoliNumero}Tyyppi`] = osapuoli.osapuolenTyyppi || "kunta";
      });

      tallentamisTiedot.suunnitteluSopimus = muunnettuSuunnitteluSopimus;
    }
    if (projekti.euRahoitusLogot) {
      const { __typename, ...euRahoitusLogotInput } = projekti.euRahoitusLogot;
      tallentamisTiedot.euRahoitusLogot = euRahoitusLogotInput;
    }
    if (projekti.asianhallinta?.aktivoitavissa) {
      tallentamisTiedot.asianhallinta = { inaktiivinen: !!projekti.asianhallinta.inaktiivinen };
    }
    return tallentamisTiedot;
  }, [projekti]);

  const isRuotsinkielinenProjekti = useRef(
    [projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)
  );

  const hasEuRahoitus = useRef(!!projekti.euRahoitus);

  const formOptions: UseFormProps<FormValues, ProjektiValidationContext> = useMemo(() => {
    return {
      resolver: yupResolver(perustiedotValidationSchema.concat(UIValuesSchema), { abortEarly: false, recursive: true }),
      defaultValues,
      mode: "onChange",
      reValidateMode: "onChange",
      context: { projekti, isRuotsinkielinenProjekti, hasEuRahoitus },
    };
  }, [defaultValues, projekti]);

  const useFormReturn = useForm<FormValues, ProjektiValidationContext>(formOptions);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
    watch,
    getValues,
  } = useFormReturn;

  const kielitiedot = watch("kielitiedot");

  useEffect(() => {
    isRuotsinkielinenProjekti.current = [kielitiedot?.ensisijainenKieli, kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI);
  }, [kielitiedot?.ensisijainenKieli, kielitiedot?.toissijainenKieli]);

  const euRahoitus = watch("euRahoitus");

  useEffect(() => {
    hasEuRahoitus.current = !!euRahoitus;
  }, [euRahoitus]);

  // Lomakkeen resetointi Velhosynkronointia varten
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useLeaveConfirm(!isSubmitting && isDirty);

  const api = useApi();

  const talletaLogo = useCallback(async (tiedosto: File) => await lataaTiedosto(api, tiedosto), [api]);
  const showTallennaProjektiMessage = useShowTallennaProjektiMessage();

  const onSubmit = useCallback(
    (data: FormValues) =>
      withLoadingSpinner(
        (async () => {
          const { suunnittelusopimusprojekti, kielitiedot, ...persistentData } = data;
          try {
            if (suunnittelusopimusprojekti === "true") {
              if (!persistentData.suunnitteluSopimus) {
                persistentData.suunnitteluSopimus = {};
              }

              if (persistentData.suunnitteluSopimus?.logo) {
                const ssLogo: LokalisoituTekstiInputEiPakollinen = {};
                const originalInputLogo = persistentData.suunnitteluSopimus.logo;
                const logoTiedostoFi = originalInputLogo?.SUOMI as unknown as File | undefined | string;
                if (logoTiedostoFi instanceof File) {
                  ssLogo.SUOMI = await talletaLogo(logoTiedostoFi);
                }
                const logoTiedostoSv = originalInputLogo?.RUOTSI as unknown as File | undefined | string;
                if (logoTiedostoSv instanceof File) {
                  ssLogo.RUOTSI = await talletaLogo(logoTiedostoSv);
                }
                if (Object.keys(ssLogo).length > 0) {
                  persistentData.suunnitteluSopimus.logo = ssLogo;
                } else {
                  persistentData.suunnitteluSopimus.logo = null;
                }
              }

              const osapuoliMaaraField = getValues("suunnitteluSopimus.osapuoliMaara" as any);
              const osapuoliMaara = parseInt(osapuoliMaaraField) || 1;

              const suunnitteluSopimusAny = persistentData.suunnitteluSopimus as any;
              const puhdistettuSuunnitteluSopimus: any = {
                kunta: suunnitteluSopimusAny.kunta,
                yhteysHenkilo: suunnitteluSopimusAny.yhteysHenkilo,
                logo: suunnitteluSopimusAny.logo,
                osapuolet: [],
              };

              if (!puhdistettuSuunnitteluSopimus.yhteysHenkilo || puhdistettuSuunnitteluSopimus.yhteysHenkilo === "") {
                puhdistettuSuunnitteluSopimus.kunta = undefined;
                puhdistettuSuunnitteluSopimus.logo = null;
              }

              for (let i = 1; i <= osapuoliMaara; i++) {
                const osapuoliAvain = `osapuoli${i}` as any;
                const osapuoliTyyppiAvain = `osapuoli${i}Tyyppi` as any;
                const osapuoliTiedot = suunnitteluSopimusAny[osapuoliAvain];
                const osapuoliTyyppi = suunnitteluSopimusAny[osapuoliTyyppiAvain];
                if (osapuoliTiedot && osapuoliTiedot.osapuolenLogo) {
                  const osapuolenLogo: LokalisoituTekstiInputEiPakollinen = {};
                  const originalOsapuolenLogo = osapuoliTiedot.osapuolenLogo;

                  const osapuolenLogoFi = originalOsapuolenLogo?.SUOMI as unknown as File | undefined | string;
                  if (osapuolenLogoFi instanceof File) {
                    osapuolenLogo.SUOMI = await talletaLogo(osapuolenLogoFi);
                  }

                  const osapuolenLogoSv = originalOsapuolenLogo?.RUOTSI as unknown as File | undefined | string;
                  if (osapuolenLogoSv instanceof File) {
                    osapuolenLogo.RUOTSI = await talletaLogo(osapuolenLogoSv);
                  }

                  osapuoliTiedot.osapuolenLogo = osapuolenLogo;
                }

                if (osapuoliTiedot) {
                  const osapuolenHenkilot = (osapuoliTiedot.osapuolenHenkilot || []).map((henkilo: any) => ({
                    etunimi: henkilo.etunimi || "",
                    sukunimi: henkilo.sukunimi || "",
                    puhelinnumero: henkilo.puhelinnumero || "",
                    email: henkilo.email || "",
                    yritys: henkilo.yritys || "", // tämä tulee organisaatioksi osapuolenNimen sijasta, jos annettu
                    //kunta: henkilo.kunta || "", tätä ei välttämättä tarvitse enää erikseen
                    valittu: henkilo.valittu || true,
                  }));

                  puhdistettuSuunnitteluSopimus.osapuolet.push({
                    osapuolenNimiFI: osapuoliTiedot.osapuolenNimiFI || "",
                    osapuolenNimiSV: osapuoliTiedot.osapuolenNimiSV || "",
                    osapuolenHenkilot: osapuolenHenkilot,
                    osapuolenTyyppi: osapuoliTyyppi || "",
                    osapuolenLogo: osapuoliTiedot.osapuolenLogo || null,
                  });
                }
              }

              puhdistettuSuunnitteluSopimus.osapuolet = puhdistettuSuunnitteluSopimus.osapuolet.map((osapuoli: any) => ({
                ...osapuoli,
                osapuolenLogo: osapuoli.osapuolenLogo || null,
              }));

              persistentData.suunnitteluSopimus = puhdistettuSuunnitteluSopimus;

              console.log("Lopullinen data:", JSON.stringify(persistentData.suunnitteluSopimus, null, 2));
            }

            if (persistentData.euRahoitus) {
              const euLogo: LokalisoituTekstiInputEiPakollinen = {};
              const originalInputLogo = persistentData.euRahoitusLogot;
              const euLogoFITiedosto = originalInputLogo?.SUOMI as unknown as File | undefined | string;
              if (euLogoFITiedosto instanceof File) {
                euLogo.SUOMI = await talletaLogo(euLogoFITiedosto);
              }

              const euLogoSVTiedosto = originalInputLogo?.RUOTSI as unknown as File | undefined | string;
              if (euLogoSVTiedosto instanceof File) {
                euLogo.RUOTSI = await talletaLogo(euLogoSVTiedosto);
              }
              persistentData.euRahoitusLogot = euLogo;
            }

            const kielitiedotInput: KielitiedotInput | null = !!kielitiedot
              ? {
                  ensisijainenKieli: kielitiedot.ensisijainenKieli as Kieli,
                  toissijainenKieli: kielitiedot.toissijainenKieli ? kielitiedot.toissijainenKieli : null,
                  projektinNimiVieraskielella: kielitiedot.projektinNimiVieraskielella,
                }
              : null;
            const apiData: TallennaProjektiInput = {
              ...persistentData,
              kielitiedot: kielitiedotInput,
            };

            setStatusBeforeSave(projekti?.status);

            const response = await api.tallennaProjekti(apiData);
            await reloadProjekti();
            showTallennaProjektiMessage(response);
            reset(data);
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
        })()
      ),
    [withLoadingSpinner, projekti?.status, api, reloadProjekti, showTallennaProjektiMessage, talletaLogo, getValues, reset]
  );

  useEffect(() => {
    // Detect status change
    if (statusBeforeSave && projekti.status) {
      log.info("previous state:" + statusBeforeSave + ", current state:" + projekti.status);
      if (statusBeforeSave === Status.EI_JULKAISTU && projekti.status === Status.ALOITUSKUULUTUS) {
        const siirtymaTimer = setTimeout(() => {
          router.push(`/yllapito/projekti/${projekti?.oid}/aloituskuulutus`);
        }, 1500);
        return () => clearTimeout(siirtymaTimer);
      }
    }
  }, [projekti, router, statusBeforeSave]);

  const { ohjeetOpen, ohjeetOnClose } = useContext(ProjektiPageLayoutContext);

  return (
    <FormProvider {...useFormReturn}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <fieldset style={{ display: "contents" }} disabled={disableFormEdit}>
          <input type="hidden" {...register("oid")} />
          <ContentSpacer gap={8} sx={{ marginTop: 8 }}>
            {!isLoadingProjekti && <ProjektiErrorNotification projekti={projekti} validationSchema={loadedProjektiValidationSchema} />}
            {!isKuulutusPublic(projekti.aloitusKuulutusJulkaisu) && (
              <Notification type={NotificationType.INFO_GRAY}>
                Projektista ei ole julkaistu aloituskuulutusta eikä se siten vielä näy palvelun julkisella puolella.
              </Notification>
            )}

            <OhjelistaNotification open={ohjeetOpen} onClose={ohjeetOnClose}>
              <li>Osa projektin perustiedoista on tuotu Projektivelhosta. Jos näissä tiedoissa on virhe, tee muutos Projektivelhoon.</li>
              <li>Puuttuvat tiedot pitää olla täytettynä ennen aloituskuulutuksen tekemistä.</li>
              <li>
                Jos tallennettuihin perustietoihin tehdään muutoksia, ne eivät vaikuta jo tehtyihin kuulutuksiin tai projektin aiempiin
                vaiheisiin.
              </li>
              <li>
                Huomaathan, että Projektin kuulutusten kielet-, Suunnittelusopimus- ja EU-rahoitus -valintaan voi vaikuttaa
                aloituskuulutuksen hyväksymiseen saakka, jonka jälkeen valinta lukittuu. Suunnittelusopimuksellisissa suunnitelmissa kunnan
                edustajaa on mahdollista vaihtaa prosessin aikana.
              </li>
            </OhjelistaNotification>
          </ContentSpacer>

          <ProjektinPerusosio projekti={projekti} register={register} formState={useFormReturn.formState} />
          <VahainenMenettelyOsio formDisabled={disableFormEdit} projekti={projekti} />
          <ProjektiKuulutuskielet projekti={projekti} />
          <LinkitetytProjektit projekti={projekti} />
          {!!projekti.suunnitelmaJaettu && <SuunnitelmaJaettuOsiin jakotieto={projekti.suunnitelmaJaettu} />}
          <ProjektiSuunnittelusopimusTiedot formDisabled={disableFormEdit} projekti={projekti} />
          <ProjektiEuRahoitusTiedot projekti={projekti} formDisabled={disableFormEdit} />
          {nykyinenKayttaja?.features?.asianhallintaIntegraatio && (
            <AsianhallintaIntegraatioYhteys projekti={projekti} formDisabled={disableFormEdit} />
          )}
          <Section gap={4}>
            <H3>Muistiinpanot</H3>
            <p>
              Voit kirjoittaa alla olevaan kenttään sisäisiä muistiinpanoja, jotka näkyvät kaikille projektiin lisätyille henkilöille.
              Muistiinpanoa voi muokata ainoastaan henkilöt, joilla on projektiin muokkausoikeudet.
            </p>
            <Textarea
              label="Muistiinpano"
              disabled={disableFormEdit}
              {...register("muistiinpano")}
              error={errors.muistiinpano}
              maxLength={maxNoteLength}
            />
          </Section>
          <Section noDivider>
            <HassuStack alignItems="flex-end">
              <Button id="save" primary disabled={disableFormEdit}>
                {projekti?.status !== Status.EI_JULKAISTU ? "Tallenna" : "Tallenna ja siirry aloituskuulutukseen"}
              </Button>
            </HassuStack>
          </Section>
        </fieldset>
      </form>
    </FormProvider>
  );
}
