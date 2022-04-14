import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import SectionContent from "@components/layout/SectionContent";
import { TallennaProjektiInput, Projekti, api, VuorovaikutusInput } from "@services/api";
import Section from "@components/layout/Section";
import { ReactElement, useEffect, useState } from "react";
import { Badge, Chip, chipClasses, Stack } from "@mui/material";
import { styled } from "@mui/material/styles";
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
import HassuDialog from "@components/HassuDialog";
import WindowCloseButton from "@components/button/WindowCloseButton";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import TextInput from "@components/form/TextInput";
import Select from "@components/form/Select";
import HassuGrid from "@components/HassuGrid";

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
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
  const today = dayjs().format();

  const HassuBadge = styled(Badge)(() => ({
    [`&.${chipClasses.deleteIcon}`]: {
      marginLeft: "0.5rem",
      marginRight: "1rem",
    },
    [`&.${chipClasses.label}`]: {
      paddingRight: "0px",
    },
  }));

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
      <div>
        <HassuDialog
          open={openVuorovaikutustilaisuus}
          onClose={() => setOpenVuorovaikutustilaisuus(false)}
          maxWidth={"lg"}
        >
          <Section noDivider smallGaps>
            <SectionContent>
              <div className="vayla-dialog-title flex">
                <div className="flex-grow">Vuorovaikutustilaisuuden lisääminen</div>
                <div className="justify-end">
                  <WindowCloseButton onClick={() => setOpenVuorovaikutustilaisuus(false)}></WindowCloseButton>
                </div>
              </div>
            </SectionContent>
            <SectionContent>
              <div className="vayla-dialog-content">
                <form>
                  <HassuStack>
                    <p>Voit valita saman vuorovaikutustavan useammin kuin yhden kerran.</p>
                    <HassuStack direction={["column", "column", "row"]}>
                      <Chip
                        icon={<HeadphonesIcon />}
                        clickable
                        label="Live-tilaisuus verkossa"
                        variant="outlined"
                        onDelete={() => console.log("lul")}
                        deleteIcon={<HassuBadge badgeContent={7} color={"primary"} />}
                      />
                      <Chip
                        icon={<LocationCityIcon />}
                        clickable
                        label="Fyysinen tilaisuus"
                        variant="outlined"
                        onDelete={() => console.log("lul")}
                        deleteIcon={<HassuBadge badgeContent={2} color={"primary"} />}
                      />
                      <Chip
                        icon={<LocalPhoneIcon />}
                        clickable
                        label="Soittoaika"
                        variant="outlined"
                        onDelete={() => console.log("lul")}
                        deleteIcon={<HassuBadge badgeContent={1} color={"primary"} />}
                      />
                    </HassuStack>
                    <Section>
                      <TextInput
                        label="Tilaisuuden nimi *"
                        // {...register2("syy", { required: "Palautuksen syy täytyy antaa" })}
                        // error={errors2.syy}
                        maxLength={200}
                      ></TextInput>
                      <HassuStack direction={["column", "column", "row"]}>
                        <DatePicker label="Päivämäärä *"></DatePicker>
                        <TextInput label="Alkaa *" maxLength={6}></TextInput>
                        <TextInput label="Päättyy *" maxLength={6}></TextInput>
                      </HassuStack>
                      <HassuGrid cols={{ lg: 3 }}>
                        <Select
                          addEmptyOption
                          options={[
                            { label: "Teams", value: "TEAMS" },
                            { label: "Zoom", value: "ZOOM" },
                          ]}
                          label="Käytettävä palvelu *"
                        />
                      </HassuGrid>
                      <TextInput label="Linkki tilaisuuteen *" maxLength={200}></TextInput>
                      <p>Linkki tilaisuuteen julkaistaan palvelun julkisella puolella kaksi (2) tuntia ennen tilaisuuden alkamista.</p>
                      <Button>Poista</Button>
                    </Section>
                  </HassuStack>
                  <HassuStack
                    direction={["column", "column", "row"]}
                    justifyContent={[undefined, undefined, "flex-end"]}
                    paddingTop={"1rem"}
                  >
                    <Button primary onClick={() => console.log("tallenna")}>
                      Tallenna
                    </Button>
                    <Button
                      onClick={(e) => {
                        setOpenVuorovaikutustilaisuus(false);
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
