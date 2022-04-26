import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import SectionContent from "@components/layout/SectionContent";
import {
  TallennaProjektiInput,
  Projekti,
  api,
  VuorovaikutusInput,
  Vuorovaikutus,
  VuorovaikutusTilaisuusTyyppi,
} from "@services/api";
import Section from "@components/layout/Section";
import { ReactElement, useEffect, useState } from "react";
import { Stack } from "@mui/material";
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
      | "vuorovaikutusJulkaisuPaiva"
      | "vuorovaikutusNumero"
      | "vuorovaikutusTilaisuudet"
      | "vuorovaikutusYhteysHenkilot"
    >;
  };
};

interface Props {
  projekti?: Projekti | null;
  reloadProjekti?: KeyedMutator<ProjektiLisatiedolla | null>;
  isDirtyHandler: (isDirty: boolean) => void;
  vuorovaikutusnro: number;
}

export default function SuunniteluvaiheenVuorovaikuttaminen({
  projekti,
  reloadProjekti,
  isDirtyHandler,
  vuorovaikutusnro,
}: Props): ReactElement {
  const [openVuorovaikutustilaisuus, setOpenVuorovaikutustilaisuus] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const [vuorovaikutus, setVuorovaikutus] = useState<Vuorovaikutus | undefined>(undefined);
  const today = dayjs().format();

  const formOptions: UseFormProps<VuorovaikutusFormValues> = {
    resolver: yupResolver(vuorovaikutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {},
  };

  const useFormReturn = useForm<VuorovaikutusFormValues>(formOptions);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
    getValues,
  } = useFormReturn;

  const saveDraft = async (formData: VuorovaikutusFormValues) => {
    setIsFormSubmitting(true);
    try {
      await saveSunnitteluvaihe(formData);
      showSuccessMessage("Tallennus onnistui!");
    } catch (e) {
      log.error("OnSubmit Error", e);
      showErrorMessage("Tallennuksessa tapahtui virhe");
    }
    setIsFormSubmitting(false);
  };

  const saveSunnitteluvaihe = async (formData: VuorovaikutusFormValues) => {
    setIsFormSubmitting(true);
    console.log(formData);
    await api.tallennaProjekti(formData);
    if (reloadProjekti) await reloadProjekti();
  };

  useEffect(() => {
    isDirtyHandler(isDirty);
  }, [isDirty, isDirtyHandler]);

  useEffect(() => {
    if (projekti && projekti.oid) {
      const v = projekti.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
        return v.vuorovaikutusNumero === vuorovaikutusnro;
      });

      setVuorovaikutus(v);

      const tallentamisTiedot: VuorovaikutusFormValues = {
        oid: projekti.oid,
        suunnitteluVaihe: {
          vuorovaikutus: {
            vuorovaikutusNumero: vuorovaikutusnro,
            vuorovaikutusJulkaisuPaiva: v?.vuorovaikutusJulkaisuPaiva,
            kysymyksetJaPalautteetViimeistaan: v?.kysymyksetJaPalautteetViimeistaan,
            vuorovaikutusTilaisuudet:
              v?.vuorovaikutusTilaisuudet?.map((tilaisuus) => {
                const { __typename, ...vuorovaikutusTilaisuusInput } = tilaisuus;
                return vuorovaikutusTilaisuusInput;
              }) || [],
          },
        },
      };
      reset(tallentamisTiedot);
    }
  }, [projekti, reset, vuorovaikutusnro]);

  if (!projekti) {
    return <></>;
  }

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
          <Section>
            <SectionContent largeGaps>
              <h5 className="vayla-small-title">Vuorovaikuttaminen</h5>
              <p>
                Kansalainen pääsee vaikuttamaan väylähankkeen tai väylän suunnitteluun siinä vaiheessa. kun tehdään
                yleissuunnitelmaa ja kun edetään tie- tai ratasuunnitelmaan. Kaikista suunnittelun vaiheista kuulutetaan
                tai ilmoitetaan, jotta asianosaisilla on mahdollisuus kommentoida suunnitelmia.
              </p>
              <h5 className="vayla-small-title">Julkaisupäivä</h5>
              <p>
                Anna päivämäärä, jolloin vuorovaikutusosio palvelun julkisella puolella ja kutsu vuorovaikutukseen
                muilla ilmoituskanavilla julkaistaan.
              </p>
            </SectionContent>
            <DatePicker
              label="Julkaisupäivä *"
              className="md:max-w-min"
              {...register("suunnitteluVaihe.vuorovaikutus.vuorovaikutusJulkaisuPaiva")}
              min={today}
              error={errors.suunnitteluVaihe?.vuorovaikutus?.vuorovaikutusJulkaisuPaiva}
            />
            <SectionContent largeGaps>
              <h5 className="vayla-small-title">Kysymyksien esittäminen ja palautteiden antaminen</h5>
              <p>Anna päivämäärä, johon mennessä kansalaisten toivotaan esittävän kysymykset ja palautteet.</p>
            </SectionContent>
            <DatePicker
              label="Kysymykset ja palautteet viimeistään *"
              className="md:max-w-min"
              {...register("suunnitteluVaihe.vuorovaikutus.kysymyksetJaPalautteetViimeistaan")}
              min={today}
              error={errors.suunnitteluVaihe?.vuorovaikutus?.kysymyksetJaPalautteetViimeistaan}
            />
          </Section>
          <Section>
            <h5 className="vayla-small-title">Vuorovaikutusmahdollisuudet palautteiden ja kysymyksien lisäksi</h5>
            <SectionContent>
              {isVerkkotilaisuuksia && (
                <>
                  <p>
                    <b>Live-tilaisuudet verkossa</b>
                  </p>
                  {vuorovaikutus?.vuorovaikutusTilaisuudet
                    ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA)
                    .map((tilaisuus, index) => {
                      return (
                        <div key={index}>
                          <p>
                            {capitalize(tilaisuus.nimi)}, {formatDate(tilaisuus.paivamaara)} klo {tilaisuus.alkamisAika}
                            -{tilaisuus.paattymisAika}, Linkki tilaisuuteen: {tilaisuus.linkki}
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
                            {capitalize(tilaisuus.nimi)}, {formatDate(tilaisuus.paivamaara)} klo {tilaisuus.alkamisAika}
                            -{tilaisuus.paattymisAika}, Osoite: {tilaisuus.paikka}, {tilaisuus.osoite}{" "}
                            {tilaisuus.postinumero} {tilaisuus.postitoimipaikka}
                          </p>
                        </div>
                      );
                    })}
                </>
              )}
              {isSoittoaikoja && (
                <>
                  <p>
                    <b>Soittoaika</b>
                  </p>
                  {vuorovaikutusTilaisuudet
                    ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA)
                    .map((tilaisuus, index) => {
                      return (
                        <div key={index}>
                          <p>
                            {capitalize(tilaisuus.nimi)}, {formatDate(tilaisuus.paivamaara)} klo {tilaisuus.alkamisAika}
                            -{tilaisuus.paattymisAika}
                          </p>
                          <p>yhteistiedot TBD</p>
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
                Lisää tilaisuus
              </Button>
            </SectionContent>
          </Section>
          <Section>
            <h5 className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h5>
            <SectionContent>
              <p>
                Esittelyvideo tulee olla ladattuna erilliseen videojulkaisupalveluun (esim. Youtube) ja videon
                katselulinkki tuodaan sille tarkoitettuun kenttään. Luonnokset ja muut materiaalit tuodaan
                Projektivelhosta.
              </p>
            </SectionContent>
          </Section>
          <Section>
            <h5 className="vayla-small-title">Vuorovaikuttamisen yhteyshenkilöt</h5>
            <SectionContent>
              <p>
                Voit valita kutsussa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden
                yhteystiedon. Projektipäällikön tiedot esitetään aina. Projektiin tallennettujen henkilöiden
                yhteystiedot haetaan Projektin henkilöt -sivulle tallennetuista tiedoista.
              </p>
            </SectionContent>
          </Section>
          <Section>
            <h5 className="vayla-small-title">Ilmoituksen vastaanottajat</h5>
            <SectionContent>
              <p>
                Vuorovaikuttamisesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille.
                Kunnat on haettu Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle
                viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi -painikkeella
              </p>
              <p>Jos kuntatiedoissa on virhe, tee korjaus Projektivelhoon.</p>
            </SectionContent>
          </Section>
          <Section>
            <h5 className="vayla-small-title">Kutsun ja ilmoituksen esikatselu</h5>
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
                onClick={() => {
                  console.log("tallenna ja julkaise");
                }}
                disabled
              >
                Tallenna julkaistavaksi
              </Button>
            </Stack>
          </Section>
          <VuorovaikutusDialog
            open={openVuorovaikutustilaisuus}
            windowHandler={setOpenVuorovaikutustilaisuus}
          ></VuorovaikutusDialog>
        </form>
      </FormProvider>
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
