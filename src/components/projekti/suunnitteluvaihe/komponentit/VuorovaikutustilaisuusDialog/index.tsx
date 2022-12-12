import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { Badge, Chip, chipClasses, DialogActions, DialogContent } from "@mui/material";
import React, { Fragment, ReactElement, useCallback, useEffect } from "react";
import { styled } from "@mui/material/styles";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import TextInput from "@components/form/TextInput";
import Select from "@components/form/Select";
import HassuGrid from "@components/HassuGrid";
import TimePicker from "@components/form/TimePicker";
import {
  KaytettavaPalvelu,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusInput,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
  YhteystietoInput,
} from "@services/api";
import capitalize from "lodash/capitalize";
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { vuorovaikutustilaisuudetSchema, vuorovaikutustilaisuusPaivitysSchema } from "src/schemas/vuorovaikutus";
import FormGroup from "@components/form/FormGroup";
import CheckBox from "@components/form/CheckBox";
import SoittoajanYhteyshenkilot from "./SoittoajanYhteyshenkilot";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { today } from "src/util/dateUtils";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";

const defaultTilaisuus: Omit<VuorovaikutusTilaisuusInput, "tyyppi"> = {
  nimi: "",
  // paivamaara value is supposed to be entered by user
  //@ts-ignore
  paivamaara: null,
  alkamisAika: "",
  paattymisAika: "",
};

const defaultOnlineTilaisuus: VuorovaikutusTilaisuusInput = {
  ...defaultTilaisuus,
  tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
};

const defaultFyysinenTilaisuus: VuorovaikutusTilaisuusInput = {
  ...defaultTilaisuus,
  tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
};

const defaultSoittoaikaTilaisuus: VuorovaikutusTilaisuusInput = {
  ...defaultTilaisuus,
  tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
};

export type VuorovaikutustilaisuusFormValues = {
  vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[];
};

function tilaisuudetInputiksi(tilaisuudet: VuorovaikutusTilaisuusInput[] | VuorovaikutusTilaisuus[]) {
  return tilaisuudet.map((tilaisuus) => {
    const tilaisuusCopy: Partial<VuorovaikutusTilaisuusInput | VuorovaikutusTilaisuus> = { ...tilaisuus };
    delete (tilaisuusCopy as Partial<VuorovaikutusTilaisuus>).__typename;
    return {
      ...tilaisuusCopy,
      esitettavatYhteystiedot: {
        yhteysHenkilot: tilaisuus.esitettavatYhteystiedot?.yhteysHenkilot || [],
        yhteysTiedot:
          tilaisuus.esitettavatYhteystiedot?.yhteysTiedot?.map((yhteystieto) => {
            const yhteystietoCopy: Partial<YhteystietoInput | Yhteystieto> = { ...yhteystieto };
            delete (yhteystietoCopy as Partial<Yhteystieto>).__typename;
            return yhteystietoCopy;
          }) || [],
      },
    };
  });
}

interface Props {
  open: boolean;
  windowHandler: (isOpen: boolean) => void;
  tilaisuudet: VuorovaikutusTilaisuusInput[] | VuorovaikutusTilaisuus[];
  projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[];
  onSubmit: (formData: VuorovaikutustilaisuusFormValues) => void;
  mostlyDisabled?: boolean;
}

export default function VuorovaikutusDialog({
  open,
  windowHandler,
  tilaisuudet,
  projektiHenkilot,
  onSubmit,
  mostlyDisabled,
}: Props): ReactElement {
  const formOptions: UseFormProps<VuorovaikutustilaisuusFormValues> = {
    resolver: yupResolver(mostlyDisabled ? vuorovaikutustilaisuusPaivitysSchema : vuorovaikutustilaisuudetSchema, {
      abortEarly: false,
      recursive: true,
    }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      vuorovaikutusTilaisuudet: tilaisuudetInputiksi(tilaisuudet),
    },
  };

  const useFormReturn = useForm<VuorovaikutustilaisuusFormValues>(formOptions);
  const {
    register,
    control,
    reset,
    formState: { errors, isDirty },
    handleSubmit,
    setValue,
    watch,
  } = useFormReturn;

  const { fields, append, remove } = useFieldArray({
    control: control,
    name: "vuorovaikutusTilaisuudet",
  });

  useEffect(() => {
    if (tilaisuudet) {
      reset({
        vuorovaikutusTilaisuudet: tilaisuudetInputiksi(tilaisuudet),
      });
    }
  }, [tilaisuudet, reset]);

  const HassuBadge = styled(Badge)(() => ({
    [`&.${chipClasses.deleteIcon}`]: {
      marginLeft: "0.5rem",
      marginRight: "1rem",
    },
    [`&.${chipClasses.label}`]: {
      paddingRight: "0px",
    },
  }));

  const HassuChip = styled(Chip)(() => ({
    [`&.${chipClasses.root}`]: {
      height: "40px",
      borderRadius: "20px",
    },
  }));

  const countTilaisuudet = useCallback(
    (tyyppi: VuorovaikutusTilaisuusTyyppi) => {
      return fields.filter((tilaisuus) => tilaisuus.tyyppi === tyyppi).length || "0";
    },
    [fields]
  );

  const saveTilaisuudet = useCallback(
    (formData: VuorovaikutustilaisuusFormValues) => {
      onSubmit(formData);
      windowHandler(false);
    },
    [onSubmit, windowHandler]
  );

  const onClose = useCallback(() => {
    windowHandler(false);
    if (isDirty) {
      reset();
    }
  }, [isDirty, reset, windowHandler]);

  const isVerkkotilaisuuksia = !!fields.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA);
  const isFyysisiatilaisuuksia = !!fields.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA);
  const isSoittoaikoja = !!fields.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA);

  return (
    <HassuDialog scroll="body" open={open} title="Vuorovaikutustilaisuuden lisääminen" onClose={onClose} maxWidth={"lg"}>
      <DialogContent>
        <FormProvider {...useFormReturn}>
          <form>
            <HassuStack>
              {mostlyDisabled ? (
                <p>Voit valita saman vuorovaikutustavan useammin kuin yhden kerran.</p>
              ) : (
                <p>
                  Kutsun jälkeen vuorovaikutustilaisuuksien muokkausta on rajoitettu. Tilaisuuden peruminen lähettää <b>minne ja mitä</b>.
                  Jos sinun tulee järjestää uudet vuorovaikutustilaisuudet peruuntuneiden tilalle, olethan yhteydessä suunnitteluohjeukseen.
                </p>
              )}
              <HassuStack direction={["column", "column", "row"]}>
                <HassuChip
                  disabled={mostlyDisabled}
                  icon={<HeadphonesIcon />}
                  clickable={!mostlyDisabled}
                  onClick={(event) => {
                    event.preventDefault();
                    append(defaultOnlineTilaisuus);
                  }}
                  id="add_live_tilaisuus"
                  label="Live-tilaisuus verkossa"
                  variant="outlined"
                  onDelete={() => {
                    append(defaultOnlineTilaisuus);
                  }}
                  deleteIcon={<HassuBadge badgeContent={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.VERKOSSA)} color={"primary"} />}
                />
                <HassuChip
                  disabled={mostlyDisabled}
                  icon={<LocationCityIcon />}
                  clickable={!mostlyDisabled}
                  onClick={(event) => {
                    event.preventDefault();
                    append(defaultFyysinenTilaisuus);
                  }}
                  id="add_fyysinen_tilaisuus"
                  label="Fyysinen tilaisuus"
                  variant="outlined"
                  onDelete={() => {
                    append(defaultFyysinenTilaisuus);
                  }}
                  deleteIcon={<HassuBadge badgeContent={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.PAIKALLA)} color={"primary"} />}
                />
                <HassuChip
                  disabled={mostlyDisabled}
                  icon={<LocalPhoneIcon />}
                  clickable={!mostlyDisabled}
                  onClick={(event) => {
                    event.preventDefault();
                    append(defaultSoittoaikaTilaisuus);
                  }}
                  id="add_soittoaika"
                  label="Soittoaika"
                  variant="outlined"
                  onDelete={() => {
                    append(defaultSoittoaikaTilaisuus);
                  }}
                  deleteIcon={<HassuBadge badgeContent={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.SOITTOAIKA)} color={"primary"} />}
                />
              </HassuStack>
              {isVerkkotilaisuuksia && (
                <Section>
                  <h4 className="vayla-small-title">Live-tilaisuudet verkossa</h4>
                  {fields.map((tilaisuus, index) => {
                    if (tilaisuus.tyyppi !== VuorovaikutusTilaisuusTyyppi.VERKOSSA) {
                      return;
                    }
                    return (
                      <SectionContent key={index} style={{ position: "relative" }}>
                        {watch(`vuorovaikutusTilaisuudet.${index}.peruttu`) && (
                          <div style={{ position: "absolute", top: "10%", left: "10%", transform: "translate(-10%, -10%)", zIndex: 10 }}>
                            <b style={{ fontSize: 100, color: "rgba(255, 0, 0, 0.5)" }}>PERUTTU</b>
                          </div>
                        )}
                        <TilaisuudenNimiJaAika index={index} mostlyDisabled={mostlyDisabled} />
                        <HassuGrid cols={{ lg: 3 }}>
                          <Select
                            addEmptyOption
                            options={Object.keys(KaytettavaPalvelu).map((palvelu) => {
                              return { label: capitalize(palvelu), value: palvelu };
                            })}
                            label="Käytettävä palvelu *"
                            {...register(`vuorovaikutusTilaisuudet.${index}.kaytettavaPalvelu`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.kaytettavaPalvelu}
                          />
                        </HassuGrid>
                        <TextInput
                          label="Linkki tilaisuuteen *"
                          maxLength={200}
                          {...register(`vuorovaikutusTilaisuudet.${index}.linkki`)}
                          error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.linkki}
                        ></TextInput>
                        <p>Linkki tilaisuuteen julkaistaan palvelun julkisella puolella kaksi (2) tuntia ennen tilaisuuden alkamista.</p>
                        {mostlyDisabled ? (
                          watch(`vuorovaikutusTilaisuudet.${index}.peruttu`) ? (
                            <Button
                              className="btn-remove-red"
                              onClick={(event) => {
                                event.preventDefault();
                                setValue(`vuorovaikutusTilaisuudet.${index}.peruttu`, true);
                              }}
                            >
                              Peru peruminen
                            </Button>
                          ) : (
                            <Button
                              className="btn-remove-red"
                              onClick={(event) => {
                                event.preventDefault();
                                setValue(`vuorovaikutusTilaisuudet.${index}.peruttu`, true);
                              }}
                            >
                              Peru tilaisuus
                            </Button>
                          )
                        ) : (
                          <Button
                            className="btn-remove-red"
                            onClick={(event) => {
                              event.preventDefault();
                              remove(index);
                            }}
                          >
                            Poista
                          </Button>
                        )}
                      </SectionContent>
                    );
                  })}
                </Section>
              )}
              {isFyysisiatilaisuuksia && (
                <Section>
                  <h4 className="vayla-small-title">Fyysiset tilaisuudet</h4>
                  {fields.map((tilaisuus, index) => {
                    if (tilaisuus.tyyppi !== VuorovaikutusTilaisuusTyyppi.PAIKALLA) {
                      return;
                    }
                    return (
                      <SectionContent key={index} style={{ position: "relative" }}>
                        {watch(`vuorovaikutusTilaisuudet.${index}.peruttu`) && (
                          <div style={{ position: "absolute", top: "10%", left: "10%", transform: "translate(-10%, -10%)", zIndex: 10 }}>
                            <b style={{ fontSize: 100, color: "rgba(255, 0, 0, 0.5)" }}>PERUTTU</b>
                          </div>
                        )}
                        <TilaisuudenNimiJaAika index={index} mostlyDisabled={mostlyDisabled} />
                        <HassuGrid cols={{ lg: 5 }}>
                          <TextInput
                            label="Paikka"
                            maxLength={200}
                            style={{ gridColumn: "1 / span 2" }}
                            {...register(`vuorovaikutusTilaisuudet.${index}.paikka`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.paikka}
                          ></TextInput>
                        </HassuGrid>
                        <HassuGrid cols={{ lg: 5 }}>
                          <TextInput
                            label="Osoite *"
                            maxLength={200}
                            disabled={mostlyDisabled}
                            style={{ gridColumn: "1 / span 2" }}
                            {...register(`vuorovaikutusTilaisuudet.${index}.osoite`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.osoite}
                          ></TextInput>
                          <TextInput
                            label="Postinumero *"
                            disabled={mostlyDisabled}
                            maxLength={200}
                            {...register(`vuorovaikutusTilaisuudet.${index}.postinumero`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.postinumero}
                          ></TextInput>

                          <TextInput
                            label="Postitoimipaikka"
                            disabled={mostlyDisabled}
                            maxLength={200}
                            {...register(`vuorovaikutusTilaisuudet.${index}.postitoimipaikka`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.postitoimipaikka}
                          ></TextInput>
                        </HassuGrid>
                        <TextInput
                          label="Saapumisohjeet"
                          {...register(`vuorovaikutusTilaisuudet.${index}.Saapumisohjeet`)}
                          error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.Saapumisohjeet}
                          maxLength={200}
                        ></TextInput>
                        {mostlyDisabled ? (
                          watch(`vuorovaikutusTilaisuudet.${index}.peruttu`) ? (
                            <Button
                              className="btn-remove-red"
                              onClick={(event) => {
                                event.preventDefault();
                                setValue(`vuorovaikutusTilaisuudet.${index}.peruttu`, true);
                              }}
                            >
                              Peru peruminen
                            </Button>
                          ) : (
                            <Button
                              className="btn-remove-red"
                              onClick={(event) => {
                                event.preventDefault();
                                setValue(`vuorovaikutusTilaisuudet.${index}.peruttu`, true);
                              }}
                            >
                              Peru tilaisuus
                            </Button>
                          )
                        ) : (
                          <Button
                            className="btn-remove-red"
                            onClick={(event) => {
                              event.preventDefault();
                              remove(index);
                            }}
                          >
                            Poista
                          </Button>
                        )}
                      </SectionContent>
                    );
                  })}
                </Section>
              )}
              {isSoittoaikoja && (
                <Section>
                  <h4 className="vayla-small-title">Soittoajat</h4>
                  {fields.map((tilaisuus, index) => {
                    if (tilaisuus.tyyppi !== VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
                      return;
                    }
                    return (
                      <SectionContent key={index} style={{ position: "relative" }}>
                        {watch(`vuorovaikutusTilaisuudet.${index}.peruttu`) && (
                          <div style={{ position: "absolute", top: "10%", left: "10%", transform: "translate(-10%, -10%)", zIndex: 10 }}>
                            <b style={{ fontSize: 100, color: "rgba(255, 0, 0, 0.5)" }}>PERUTTU</b>
                          </div>
                        )}
                        <TilaisuudenNimiJaAika index={index} mostlyDisabled={mostlyDisabled} />
                        <SectionContent>
                          <h4 className="vayla-smallest-title">Soittoajassa esitettävät yhteyshenkilöt</h4>
                          <p>
                            Voit valita soittoajassa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden
                            yhteystiedon. Projektiin tallennettujen henkilöiden yhteystiedot haetaan Projektin henkilöt -sivulle
                            tallennetuista tiedoista.
                          </p>
                          {projektiHenkilot ? (
                            <Controller
                              control={control}
                              name={`vuorovaikutusTilaisuudet.${index}.esitettavatYhteystiedot.yhteysHenkilot`}
                              render={({ field: { onChange, value, ...field } }) => (
                                <FormGroup
                                  label="Projektiin tallennetut henkilöt"
                                  inlineFlex
                                  errorMessage={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.esitettavatYhteystiedot?.message}
                                >
                                  {projektiHenkilot?.map((hlo, index) => {
                                    const tunnuslista = value || [];
                                    return (
                                      <Fragment key={index}>
                                        <CheckBox
                                          label={yhteystietoVirkamiehelleTekstiksi(hlo)}
                                          onChange={(event) => {
                                            if (!event.target.checked) {
                                              onChange(tunnuslista.filter((tunnus) => tunnus !== hlo.kayttajatunnus));
                                            } else {
                                              onChange([...tunnuslista, hlo.kayttajatunnus]);
                                            }
                                          }}
                                          checked={tunnuslista.includes(hlo.kayttajatunnus)}
                                          {...field}
                                        />
                                      </Fragment>
                                    );
                                  })}
                                </FormGroup>
                              )}
                            />
                          ) : (
                            <p>Projektilla ei ole tallennettuja henkilöitä</p>
                          )}
                        </SectionContent>
                        <SoittoajanYhteyshenkilot tilaisuusIndex={index} />
                        {mostlyDisabled ? (
                          watch(`vuorovaikutusTilaisuudet.${index}.peruttu`) ? (
                            <Button
                              className="btn-remove-red"
                              onClick={(event) => {
                                event.preventDefault();
                                setValue(`vuorovaikutusTilaisuudet.${index}.peruttu`, true);
                              }}
                            >
                              Peru peruminen
                            </Button>
                          ) : (
                            <Button
                              className="btn-remove-red"
                              onClick={(event) => {
                                event.preventDefault();
                                setValue(`vuorovaikutusTilaisuudet.${index}.peruttu`, true);
                              }}
                            >
                              Peru tilaisuus
                            </Button>
                          )
                        ) : (
                          <Button
                            className="btn-remove-red"
                            onClick={(event) => {
                              event.preventDefault();
                              remove(index);
                            }}
                          >
                            Poista
                          </Button>
                        )}
                      </SectionContent>
                    );
                  })}
                </Section>
              )}
            </HassuStack>
          </form>
        </FormProvider>
      </DialogContent>

      <DialogActions>
        <Button primary onClick={handleSubmit(saveTilaisuudet)} id="save_vuorovaikutus_tilaisuudet">
          Tallenna
        </Button>
        <Button
          onClick={(e) => {
            onClose();
            e.preventDefault();
          }}
        >
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}

function TilaisuudenNimiJaAika(props: { index: number; mostlyDisabled?: boolean }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<VuorovaikutustilaisuusFormValues>();
  return (
    <>
      <TextInput
        label="Tilaisuuden nimi"
        {...register(`vuorovaikutusTilaisuudet.${props.index}.nimi`)}
        error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.nimi}
        maxLength={200}
      />{" "}
      <HassuStack direction={["column", "column", "row"]}>
        <HassuDatePickerWithController
          disabled={props.mostlyDisabled}
          label="Päivämäärä"
          minDate={today()}
          textFieldProps={{ required: true }}
          controllerProps={{ name: `vuorovaikutusTilaisuudet.${props.index}.paivamaara` }}
        />
        <TimePicker
          disabled={props.mostlyDisabled}
          label="Alkaa *"
          {...register(`vuorovaikutusTilaisuudet.${props.index}.alkamisAika`)}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.alkamisAika}
        ></TimePicker>
        <TimePicker
          disabled={props.mostlyDisabled}
          label="Päättyy *"
          {...register(`vuorovaikutusTilaisuudet.${props.index}.paattymisAika`)}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.paattymisAika}
        ></TimePicker>
      </HassuStack>
    </>
  );
}
