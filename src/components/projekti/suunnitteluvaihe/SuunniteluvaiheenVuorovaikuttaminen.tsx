import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import SectionContent from "@components/layout/SectionContent";
import { TallennaProjektiInput, Projekti, api, VuorovaikutusInput } from "@services/api";
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

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  suunnitteluVaihe: {
    vuorovaikutus: Pick<
      VuorovaikutusInput,
      | "aineistoPoistetaanNakyvista"
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
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const today = dayjs().format();

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(vuorovaikutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {},
  };

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = useFormReturn;

  const saveDraft = async (formData: FormValues) => {
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

  const saveSunnitteluvaihe = async (formData: FormValues) => {
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
      const vuorovaikutus = projekti.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
        return v.vuorovaikutusNumero === vuorovaikutusnro;
      });
      const tallentamisTiedot: FormValues = {
        oid: projekti.oid,
        suunnitteluVaihe: {
          vuorovaikutus: {
            vuorovaikutusNumero: vuorovaikutusnro,
            vuorovaikutusJulkaisuPaiva: vuorovaikutus?.vuorovaikutusJulkaisuPaiva,
            kysymyksetJaPalautteetViimeistaan: vuorovaikutus?.kysymyksetJaPalautteetViimeistaan,
          },
        },
      };
      reset(tallentamisTiedot);
    }
  }, [projekti, reset, vuorovaikutusnro]);

  if (!projekti) {
    return <></>;
  }

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <Section>
            <SectionContent largeGaps>
              <h4 className="vayla-title">Vuorovaikuttaminen</h4>
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
              <Button type="submit" onClick={() => console.log("tilaisuuden lisäys")}>
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
                <Button type="submit" onClick={() => console.log("kutsun esikatselu")}>
                  Kutsun esikatselu
                </Button>
                <Button type="submit" onClick={() => console.log("ilmoituksen esikatselu")}>
                  Ilmoituksen esikatselu
                </Button>
              </HassuStack>
            </SectionContent>
          </Section>
        </form>
      </FormProvider>
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
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
