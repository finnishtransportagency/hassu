import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import SectionContent from "@components/layout/SectionContent";
import { KuntaVastaanottajaInput, LinkkiInput, VuorovaikutusTilaisuusInput } from "../../../../common/graphql/apiModel";
import {
  TallennaProjektiInput,
  Projekti,
  api,
  VuorovaikutusInput,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
  YhteystietoInput,
  ViranomaisVastaanottajaInput,
  IlmoitettavaViranomainen,
  IlmoituksenVastaanottajatInput,
} from "@services/api";
import Section from "@components/layout/Section";
import React, { ReactElement, useEffect, useState, useMemo, useCallback } from "react";
import Button from "@components/button/Button";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuSpinner from "@components/HassuSpinner";
import { KeyedMutator } from "swr";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import DatePicker from "@components/form/DatePicker";
import dayjs from "dayjs";
import { vuorovaikutusSchema } from "src/schemas/vuorovaikutus";
import HassuStack from "@components/layout/HassuStack";
import VuorovaikutusDialog from "./VuorovaikutustilaisuusDialog";
import { formatDate } from "src/util/dateUtils";
import capitalize from "lodash/capitalize";
import { Stack } from "@mui/material";
import HassuDialog from "@components/HassuDialog";
import WindowCloseButton from "@components/button/WindowCloseButton";
import useTranslation from "next-translate/useTranslation";
import { UseFormReturn } from "react-hook-form";
import EsitettavatYhteystiedot from "./EsitettavatYhteystiedot";
import LuonnoksetJaAineistot from "./LuonnoksetJaAineistot";
import IlmoituksenVastaanottajat from "./IlmoituksenVastaanottajat";
import { removeTypeName } from "src/util/removeTypeName";
import getIlmoitettavaViranomainen from "src/util/getIlmoitettavaViranomainen";

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
  const [openVuorovaikutustilaisuus, setOpenVuorovaikutustilaisuus] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [openHyvaksy, setOpenHyvaksy] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const today = dayjs().format();
  const { t } = useTranslation();

  const TilaisuudenPerustiedot = React.memo((props: { tilaisuus: VuorovaikutusTilaisuusInput }) => {
    return (
      <>
        {capitalize(t(`common:viikonpaiva_${dayjs(props.tilaisuus.paivamaara).day()}`))}{" "}
        {formatDate(props.tilaisuus.paivamaara)} klo {props.tilaisuus.alkamisAika}-{props.tilaisuus.paattymisAika}
        {props.tilaisuus.nimi ? `${" "}(${capitalize(props.tilaisuus.nimi)})` : undefined}
      </>
    );
  });
  TilaisuudenPerustiedot.displayName = "TilaisuudenPerustiedot";

  const defaultValues: Omit<VuorovaikutusFormValues, "oid"> = useMemo(() => {
    const v = projekti?.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
      return v.vuorovaikutusNumero === vuorovaikutusnro;
    });
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
  }, [projekti, vuorovaikutusnro, kirjaamoOsoitteet]);

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
    formState: { errors, isDirty },
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
        console.log(formData);
        await saveSunnitteluvaihe(formData);
        showSuccessMessage("Tallennus onnistui!");
      } catch (e) {
        log.error("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe");
      }
      setOpenHyvaksy(false);
      setIsFormSubmitting(false);
    },
    [saveSunnitteluvaihe, showErrorMessage, showSuccessMessage]
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
  const vuorovaikutusTilaisuudet = getValues("suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet");

  const isVerkkotilaisuuksia = !!vuorovaikutusTilaisuudet?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA
  );
  const isFyysisiatilaisuuksia = !!vuorovaikutusTilaisuudet?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA
  );
  const isSoittoaikoja = !!vuorovaikutusTilaisuudet?.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA);

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <fieldset>
            <Section>
              <SectionContent>
                <h4 className="vayla-small-title">Vuorovaikuttaminen</h4>
                <p>
                  Kansalainen pääsee vaikuttamaan väylähankkeen tai väylän suunnitteluun siinä vaiheessa. kun tehdään
                  yleissuunnitelmaa ja kun edetään tie- tai ratasuunnitelmaan. Kaikista suunnittelun vaiheista
                  kuulutetaan tai ilmoitetaan, jotta asianosaisilla on mahdollisuus kommentoida suunnitelmia.
                </p>
              </SectionContent>
              <SectionContent>
                <h4 className="vayla-small-title">Julkaisupäivä</h4>
                <p>
                  Anna päivämäärä, jolloin vuorovaikutusosio palvelun julkisella puolella ja kutsu vuorovaikutukseen
                  muilla ilmoituskanavilla julkaistaan.
                </p>
                <DatePicker
                  label="Julkaisupäivä *"
                  className="md:max-w-min"
                  {...register("suunnitteluVaihe.vuorovaikutus.vuorovaikutusJulkaisuPaiva")}
                  min={today}
                  error={errors.suunnitteluVaihe?.vuorovaikutus?.vuorovaikutusJulkaisuPaiva}
                />
              </SectionContent>
              <SectionContent>
                <h4 className="vayla-small-title">Kysymyksien esittäminen ja palautteiden antaminen</h4>
                <p>Anna päivämäärä, johon mennessä kansalaisten toivotaan esittävän kysymykset ja palautteet.</p>
                <DatePicker
                  label="Kysymykset ja palautteet viimeistään *"
                  className="md:max-w-min"
                  {...register("suunnitteluVaihe.vuorovaikutus.kysymyksetJaPalautteetViimeistaan")}
                  min={today}
                  error={errors.suunnitteluVaihe?.vuorovaikutus?.kysymyksetJaPalautteetViimeistaan}
                />
              </SectionContent>
            </Section>
            <Section>
              <h4 className="vayla-small-title">Vuorovaikutusmahdollisuudet palautteiden ja kysymyksien lisäksi</h4>
              <SectionContent>
                {isVerkkotilaisuuksia && (
                  <>
                    <p>
                      <b>Live-tilaisuudet verkossa</b>
                    </p>
                    {vuorovaikutusTilaisuudet
                      ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA)
                      .map((tilaisuus, index) => {
                        return (
                          <div key={index}>
                            <p>
                              <TilaisuudenPerustiedot tilaisuus={tilaisuus} />, Linkki tilaisuuteen: {tilaisuus.linkki}
                            </p>
                          </div>
                        );
                      })}
                  </>
                )}
                {isFyysisiatilaisuuksia && (
                  <>
                    <p>
                      <b>Fyysiset tilaisuudet</b>
                    </p>
                    {vuorovaikutusTilaisuudet
                      ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA)
                      .map((tilaisuus, index) => {
                        return (
                          <div key={index}>
                            <p>
                              <TilaisuudenPerustiedot tilaisuus={tilaisuus} />, Osoite: {tilaisuus.paikka},{" "}
                              {tilaisuus.osoite} {tilaisuus.postinumero} {tilaisuus.postitoimipaikka}
                            </p>
                          </div>
                        );
                      })}
                  </>
                )}
                {isSoittoaikoja && (
                  <>
                    <p>
                      <b>Soittoajat</b>
                    </p>
                    {vuorovaikutusTilaisuudet
                      ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA)
                      .map((tilaisuus, index) => {
                        return (
                          <div key={index}>
                            <p>
                              <TilaisuudenPerustiedot tilaisuus={tilaisuus} />
                            </p>
                            <div>
                              {tilaisuus.esitettavatYhteystiedot?.map((yhteystieto, index) => {
                                return <SoittoajanYhteystieto key={index} yhteystieto={yhteystieto} />;
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </>
                )}

                <Button
                  onClick={(e) => {
                    setOpenVuorovaikutustilaisuus(true);
                    e.preventDefault();
                  }}
                >
                  {isFyysisiatilaisuuksia || isVerkkotilaisuuksia || isSoittoaikoja
                    ? "Muokkaa tilaisuuksia"
                    : "Lisää tilaisuus"}
                </Button>
              </SectionContent>
            </Section>
            <LuonnoksetJaAineistot
              useFormReturn={useFormReturn as UseFormReturn<FormValuesForLuonnoksetJaAineistot, object>}
            />
            <EsitettavatYhteystiedot
              useFormReturn={useFormReturn as UseFormReturn<FormValuesForEsitettavatYhteystiedot, object>}
              projekti={projekti}
            />
            <IlmoituksenVastaanottajat kirjaamoOsoitteet={kirjaamoOsoitteet} />
            <Section>
              <h4 className="vayla-small-title">Kutsun ja ilmoituksen esikatselu</h4>
              <SectionContent>
                <HassuStack direction={["column", "column", "row"]}>
                  <Button type="submit" onClick={() => console.log("kutsun esikatselu")} disabled>
                    Kutsun esikatselu
                  </Button>
                  <Button type="submit" onClick={() => console.log("ilmoituksen esikatselu")} disabled>
                    Ilmoituksen esikatselu
                  </Button>
                </HassuStack>
              </SectionContent>
            </Section>
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
          </fieldset>
          <VuorovaikutusDialog
            open={openVuorovaikutustilaisuus}
            windowHandler={setOpenVuorovaikutustilaisuus}
            tilaisuudet={vuorovaikutusTilaisuudet}
            kayttoOikeudet={projekti.kayttoOikeudet}
          ></VuorovaikutusDialog>
          <input type="hidden" {...register("suunnitteluVaihe.vuorovaikutus.julkinen")} />
        </form>
      </FormProvider>
      <div>
        <HassuDialog open={openHyvaksy} onClose={handleClickCloseHyvaksy}>
          <Section noDivider smallGaps>
            <SectionContent>
              <div className="vayla-dialog-title flex">
                <div className="flex-grow">Kuulutuksen hyväksyminen ja ilmoituksen lähettäminen</div>
                <div className="justify-end">
                  <WindowCloseButton
                    onClick={() => {
                      handleClickCloseHyvaksy();
                    }}
                  ></WindowCloseButton>
                </div>
              </div>
            </SectionContent>
            <SectionContent>
              <div className="vayla-dialog-content">
                <form>
                  <p>
                    Olet tallentamassa vuorovaikutustiedot ja käynnistämässä siihen liittyvän ilmoituksen automaattisen
                    lähettämisen. Ilmoitus vuorovaikutuksesta lähetetään seuraaville:
                  </p>
                  <div className="content">
                    <p>Viranomaiset</p>
                    <ul className="vayla-dialog-list">
                      {ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) => (
                        <li key={viranomainen.nimi}>
                          {t(`common:viranomainen.${viranomainen.nimi}`)}, {viranomainen.sahkoposti}
                        </li>
                      ))}
                    </ul>
                    <p>Kunnat</p>
                    <ul className="vayla-dialog-list">
                      {ilmoituksenVastaanottajat?.kunnat?.map((kunta) => (
                        <li key={kunta.nimi}>
                          {kunta.nimi}, {kunta.sahkoposti}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="content">
                    <p>
                      Klikkaamalla Tallenna ja lähetä -painiketta vahvistat vuorovaikutustiedot tarkastetuksi ja
                      hyväksyt sen julkaisun asetettuna julkaisupäivänä sekä ilmoituksien lähettämisen. Ilmoitukset
                      lähetetään automaattisesti painikkeen klikkaamisen jälkeen.
                    </p>
                  </div>
                  <HassuStack
                    direction={["column", "column", "row"]}
                    justifyContent={[undefined, undefined, "flex-end"]}
                    paddingTop={"1rem"}
                  >
                    <Button primary onClick={handleSubmit(saveAndPublish)}>
                      Hyväksy ja lähetä
                    </Button>
                    <Button
                      onClick={(e) => {
                        handleClickCloseHyvaksy();
                        e.preventDefault();
                      }}
                    >
                      Peruuta
                    </Button>
                  </HassuStack>
                </form>
              </div>
            </SectionContent>
          </Section>
        </HassuDialog>
      </div>
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
export const SoittoajanYhteystieto = React.memo((props: { yhteystieto: Yhteystieto | YhteystietoInput }) => {
  return (
    <>
      <p>
        {props.yhteystieto.etunimi} {props.yhteystieto.sukunimi}
        {props.yhteystieto.titteli ? `, ${props.yhteystieto.titteli}` : null}
        {props.yhteystieto.organisaatio ? ` (${props.yhteystieto.organisaatio})` : null}:{" "}
        {props.yhteystieto.puhelinnumero}
      </p>
    </>
  );
});
SoittoajanYhteystieto.displayName = "SoittoajanYhteystieto";
