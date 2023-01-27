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
  Kieli,
  LokalisoituTekstiInput,
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
import { useProjekti } from "src/hooks/useProjekti";
import { lowerCase } from "lodash";

function defaultTilaisuus(
  ensisijainenKieli: Kieli,
  toissijainenKieli: Kieli | undefined | null
): Omit<VuorovaikutusTilaisuusInput, "tyyppi"> {
  const nimi: LokalisoituTekstiInput = {
    [Kieli.SUOMI]: "",
    [ensisijainenKieli]: "",
  };
  if (toissijainenKieli) {
    nimi[toissijainenKieli] = "";
  }
  return {
    nimi,
    // paivamaara value is supposed to be entered by user
    //@ts-ignore
    paivamaara: null,
    alkamisAika: "",
    paattymisAika: "",
  };
}

function defaultOnlineTilaisuus(ensisijainenKieli: Kieli, toissijainenKieli: Kieli | undefined | null): VuorovaikutusTilaisuusInput {
  return {
    ...defaultTilaisuus(ensisijainenKieli, toissijainenKieli),
    tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
  };
}

function defaultFyysinenTilaisuus(ensisijainenKieli: Kieli, toissijainenKieli: Kieli | undefined | null): VuorovaikutusTilaisuusInput {
  return {
    ...defaultTilaisuus(ensisijainenKieli, toissijainenKieli),
    tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
  };
}

function defaultSoittoaikaTilaisuus(ensisijainenKieli: Kieli, toissijainenKieli: Kieli | undefined | null): VuorovaikutusTilaisuusInput {
  return {
    ...defaultTilaisuus(ensisijainenKieli, toissijainenKieli),
    tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
  };
}

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
  const { data: projekti } = useProjekti();

  const ensisijainenKieli = projekti?.kielitiedot?.ensisijainenKieli || Kieli.SUOMI;
  const toissijainenKieli = projekti?.kielitiedot?.toissijainenKieli;

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
    context: { projekti },
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
                    append(defaultOnlineTilaisuus(ensisijainenKieli, toissijainenKieli));
                  }}
                  id="add_live_tilaisuus"
                  label="Live-tilaisuus verkossa"
                  variant="outlined"
                  onDelete={() => {
                    append(defaultOnlineTilaisuus(ensisijainenKieli, toissijainenKieli));
                  }}
                  deleteIcon={<HassuBadge badgeContent={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.VERKOSSA)} color={"primary"} />}
                />
                <HassuChip
                  disabled={mostlyDisabled}
                  icon={<LocationCityIcon />}
                  clickable={!mostlyDisabled}
                  onClick={(event) => {
                    event.preventDefault();
                    append(defaultFyysinenTilaisuus(ensisijainenKieli, toissijainenKieli));
                  }}
                  id="add_fyysinen_tilaisuus"
                  label="Fyysinen tilaisuus"
                  variant="outlined"
                  onDelete={() => {
                    append(defaultFyysinenTilaisuus(ensisijainenKieli, toissijainenKieli));
                  }}
                  deleteIcon={<HassuBadge badgeContent={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.PAIKALLA)} color={"primary"} />}
                />
                <HassuChip
                  disabled={mostlyDisabled}
                  icon={<LocalPhoneIcon />}
                  clickable={!mostlyDisabled}
                  onClick={(event) => {
                    event.preventDefault();
                    append(defaultSoittoaikaTilaisuus(ensisijainenKieli, toissijainenKieli));
                  }}
                  id="add_soittoaika"
                  label="Soittoaika"
                  variant="outlined"
                  onDelete={() => {
                    append(defaultSoittoaikaTilaisuus(ensisijainenKieli, toissijainenKieli));
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
                    const peruttu = watch(`vuorovaikutusTilaisuudet.${index}.peruttu`);
                    return (
                      <SectionContent key={index} style={{ position: "relative" }}>
                        <TilaisuudenNimiJaAika index={index} mostlyDisabled={mostlyDisabled} peruttu={peruttu} />
                        <HassuGrid cols={{ lg: 3 }}>
                          <Select
                            addEmptyOption
                            options={Object.keys(KaytettavaPalvelu).map((palvelu) => {
                              return { label: capitalize(palvelu), value: palvelu };
                            })}
                            label="Käytettävä palvelu *"
                            {...register(`vuorovaikutusTilaisuudet.${index}.kaytettavaPalvelu`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.kaytettavaPalvelu}
                            disabled={!!peruttu}
                          />
                        </HassuGrid>
                        <TextInput
                          label="Linkki tilaisuuteen *"
                          maxLength={200}
                          {...register(`vuorovaikutusTilaisuudet.${index}.linkki`)}
                          error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.linkki}
                          disabled={!!peruttu}
                        ></TextInput>
                        <p>Linkki tilaisuuteen julkaistaan palvelun julkisella puolella kaksi (2) tuntia ennen tilaisuuden alkamista.</p>
                        {mostlyDisabled ? (
                          !peruttu && (
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
                    const peruttu = watch(`vuorovaikutusTilaisuudet.${index}.peruttu`);
                    return (
                      <SectionContent key={index} style={{ position: "relative" }}>
                        <TilaisuudenNimiJaAika index={index} mostlyDisabled={mostlyDisabled} peruttu={peruttu} />
                        <HassuGrid cols={{ lg: 3 }}>
                          <TextInput
                            label={`Paikan nimi ensisijaisella kielellä (${lowerCase(ensisijainenKieli)})`}
                            maxLength={200}
                            style={{ gridColumn: "1 / span 1" }}
                            {...register(`vuorovaikutusTilaisuudet.${index}.paikka.${ensisijainenKieli}`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.paikka?.[ensisijainenKieli]}
                            disabled={mostlyDisabled}
                          />
                          {toissijainenKieli && (
                            <TextInput
                              label={`Paikan nimi toissijaisella kielellä (${lowerCase(toissijainenKieli)})`}
                              maxLength={200}
                              style={{ gridColumn: "2 / span 1" }}
                              {...register(`vuorovaikutusTilaisuudet.${index}.paikka.${toissijainenKieli}`)}
                              error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.paikka?.[toissijainenKieli]}
                              disabled={mostlyDisabled}
                            />
                          )}
                        </HassuGrid>
                        <HassuGrid cols={{ lg: 5 }}>
                          <TextInput
                            label={`Osoite ensisijaisella kielellä (${lowerCase(ensisijainenKieli)}) *`}
                            maxLength={200}
                            disabled={mostlyDisabled}
                            style={{ gridColumn: "1 / span 2" }}
                            {...register(`vuorovaikutusTilaisuudet.${index}.osoite.${ensisijainenKieli}`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.osoite?.[ensisijainenKieli]}
                          />
                          <TextInput
                            label="Postinumero *"
                            disabled={mostlyDisabled}
                            maxLength={200}
                            {...register(`vuorovaikutusTilaisuudet.${index}.postinumero`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.postinumero}
                          />
                          <TextInput
                            label="Postitoimipaikka"
                            disabled={mostlyDisabled}
                            maxLength={200}
                            {...register(`vuorovaikutusTilaisuudet.${index}.postitoimipaikka.${ensisijainenKieli}`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.postitoimipaikka?.[ensisijainenKieli]}
                          />
                        </HassuGrid>
                        {toissijainenKieli && (
                          <HassuGrid cols={{ lg: 5 }}>
                            <TextInput
                              label={`Osoite toissijaisella kielellä (${lowerCase(toissijainenKieli)}) *`}
                              maxLength={200}
                              disabled={mostlyDisabled}
                              style={{ gridColumn: "1 / span 2" }}
                              {...register(`vuorovaikutusTilaisuudet.${index}.osoite.${toissijainenKieli}`)}
                              error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.osoite?.[toissijainenKieli]}
                            />
                            <TextInput
                              label="Postinumero *"
                              disabled={true}
                              maxLength={200}
                              value={watch(`vuorovaikutusTilaisuudet.${index}.postinumero`) || ""}
                            />
                            <TextInput
                              label="Postitoimipaikka"
                              disabled={mostlyDisabled}
                              maxLength={200}
                              {...register(`vuorovaikutusTilaisuudet.${index}.postitoimipaikka.${toissijainenKieli}`)}
                              error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.postitoimipaikka?.[toissijainenKieli]}
                            />
                          </HassuGrid>
                        )}

                        <TextInput
                          label={`Saapumisohjeet ensisijaisella kielellä (${lowerCase(ensisijainenKieli)})`}
                          {...register(`vuorovaikutusTilaisuudet.${index}.Saapumisohjeet.${ensisijainenKieli}`)}
                          error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.Saapumisohjeet?.[ensisijainenKieli]}
                          maxLength={200}
                          disabled={!!peruttu}
                        />
                        {toissijainenKieli && (
                          <TextInput
                            label={`Saapumisohjeet ensisijaisella kielellä (${lowerCase(toissijainenKieli)})`}
                            {...register(`vuorovaikutusTilaisuudet.${index}.Saapumisohjeet.${toissijainenKieli}`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.Saapumisohjeet?.[toissijainenKieli]}
                            maxLength={200}
                            disabled={!!peruttu}
                          />
                        )}
                        {mostlyDisabled ? (
                          !peruttu && (
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
                    const peruttu = watch(`vuorovaikutusTilaisuudet.${index}.peruttu`);
                    return (
                      <SectionContent key={index} style={{ position: "relative" }}>
                        <TilaisuudenNimiJaAika index={index} mostlyDisabled={mostlyDisabled} peruttu={peruttu} />
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
                                          disabled={!!peruttu}
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
                        <SoittoajanYhteyshenkilot tilaisuusIndex={index} disabled={!!peruttu} />
                        {mostlyDisabled ? (
                          !peruttu && (
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
            reset();
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

function TilaisuudenNimiJaAika(props: { index: number; mostlyDisabled?: boolean; peruttu?: boolean | null }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<VuorovaikutustilaisuusFormValues>();

  const { data: projekti } = useProjekti();

  const ensisijainenKieli = projekti?.kielitiedot?.ensisijainenKieli || Kieli.SUOMI;
  const toissijainenKieli = projekti?.kielitiedot?.toissijainenKieli;

  return (
    <>
      {!!props.peruttu && <div className="text-red">PERUTTU</div>}
      <TextInput
        label={`Tilaisuuden nimi ensisijaisella kielellä (${lowerCase(ensisijainenKieli)})`}
        {...register(`vuorovaikutusTilaisuudet.${props.index}.nimi.${ensisijainenKieli}`)}
        error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.nimi?.[ensisijainenKieli]}
        disabled={!!props.peruttu}
        maxLength={200}
      />
      {toissijainenKieli && (
        <TextInput
          label={`Tilaisuuden nimi toissijaisella kielellä (${lowerCase(toissijainenKieli)})`}
          {...register(`vuorovaikutusTilaisuudet.${props.index}.nimi.${toissijainenKieli}`)}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.nimi?.[toissijainenKieli]}
          disabled={!!props.peruttu}
          maxLength={200}
        />
      )}{" "}
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
