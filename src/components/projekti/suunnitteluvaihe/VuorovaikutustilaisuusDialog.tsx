import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { Badge, Chip, chipClasses, DialogActions, DialogContent } from "@mui/material";
import React, { Fragment, ReactElement, useCallback, useEffect } from "react";
import { styled } from "@mui/material/styles";
import Button from "@components/button/Button";
import DatePicker from "@components/form/DatePicker";
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
  ProjektiKayttaja,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusInput,
  VuorovaikutusTilaisuusTyyppi,
} from "@services/api";
import capitalize from "lodash/capitalize";
import { VuorovaikutusFormValues } from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenVuorovaikuttaminen";
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { vuorovaikutustilaisuudetSchema } from "src/schemas/vuorovaikutus";
import FormGroup from "@components/form/FormGroup";
import CheckBox from "@components/form/CheckBox";
import SoittoajanYhteyshenkilot from "./SoittoajanYhteyshenkilot";
import dayjs from "dayjs";

const defaultTilaisuus = {
  nimi: "",
  paivamaara: "",
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
interface Props {
  open: boolean;
  windowHandler: (isOpen: boolean) => void;
  tilaisuudet: VuorovaikutusTilaisuus[] | null | undefined;
  kayttoOikeudet: ProjektiKayttaja[] | null | undefined;
  julkinen: boolean;
  avaaHyvaksymisDialogi: () => void;
}

export default function VuorovaikutusDialog({
  open,
  windowHandler,
  tilaisuudet,
  kayttoOikeudet,
  julkinen,
  avaaHyvaksymisDialogi,
}: Props): ReactElement {
  const formOptions: UseFormProps<VuorovaikutustilaisuusFormValues> = {
    resolver: yupResolver(vuorovaikutustilaisuudetSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { vuorovaikutusTilaisuudet: [] },
  };

  const { setValue: parentSetValue } = useFormContext<VuorovaikutusFormValues>();

  const useFormReturn = useForm<VuorovaikutustilaisuusFormValues>(formOptions);
  const {
    register,
    control,
    reset,
    formState: { errors, isDirty },
    handleSubmit,
  } = useFormReturn;

  const { fields, append, remove } = useFieldArray({
    control: control,
    name: "vuorovaikutusTilaisuudet",
  });

  useEffect(() => {
    if (tilaisuudet) {
      const tilaisuuksienTiedot = {
        vuorovaikutusTilaisuudet: tilaisuudet,
      };
      reset(tilaisuuksienTiedot);
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
      parentSetValue("suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet", formData.vuorovaikutusTilaisuudet, {
        shouldDirty: true,
        shouldValidate: true,
      });
      windowHandler(false);
      if (julkinen) {
        avaaHyvaksymisDialogi();
      }
    },
    [parentSetValue, windowHandler, julkinen, avaaHyvaksymisDialogi]
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
              <p>Voit valita saman vuorovaikutustavan useammin kuin yhden kerran.</p>
              <HassuStack direction={["column", "column", "row"]}>
                <HassuChip
                  icon={<HeadphonesIcon />}
                  clickable
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
                  icon={<LocationCityIcon />}
                  clickable
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
                  icon={<LocalPhoneIcon />}
                  clickable
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
                    if (tilaisuus.tyyppi !== VuorovaikutusTilaisuusTyyppi.VERKOSSA) return;
                    return (
                      <SectionContent key={index}>
                        <TilaisuudenNimiJaAika index={index} />
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
                        <Button
                          className="btn-remove-red"
                          onClick={(event) => {
                            event.preventDefault();
                            remove(index);
                          }}
                        >
                          Poista
                        </Button>
                      </SectionContent>
                    );
                  })}
                </Section>
              )}
              {isFyysisiatilaisuuksia && (
                <Section>
                  <h4 className="vayla-small-title">Fyysiset tilaisuudet</h4>
                  {fields.map((tilaisuus, index) => {
                    if (tilaisuus.tyyppi !== VuorovaikutusTilaisuusTyyppi.PAIKALLA) return;
                    return (
                      <SectionContent key={index}>
                        <TilaisuudenNimiJaAika index={index} />
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
                            style={{ gridColumn: "1 / span 2" }}
                            {...register(`vuorovaikutusTilaisuudet.${index}.osoite`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.osoite}
                          ></TextInput>
                          <TextInput
                            label="Postinumero *"
                            maxLength={200}
                            {...register(`vuorovaikutusTilaisuudet.${index}.postinumero`)}
                            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.postinumero}
                          ></TextInput>

                          <TextInput
                            label="Postitoimipaikka"
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
                        <Button
                          className="btn-remove-red"
                          onClick={(event) => {
                            event.preventDefault();
                            remove(index);
                          }}
                        >
                          Poista
                        </Button>
                      </SectionContent>
                    );
                  })}
                </Section>
              )}
              {isSoittoaikoja && (
                <Section>
                  <h4 className="vayla-small-title">Soittoajat</h4>
                  {fields.map((tilaisuus, index) => {
                    if (tilaisuus.tyyppi !== VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) return;
                    return (
                      <SectionContent key={index}>
                        <TilaisuudenNimiJaAika index={index} />
                        <SectionContent>
                          <h4 className="vayla-smallest-title">Soittoajassa esitettävät yhteyshenkilöt</h4>
                          <p>
                            Voit valita soittoajassa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden
                            yhteystiedon. Projektiin tallennettujen henkilöiden yhteystiedot haetaan Projektin henkilöt -sivulle
                            tallennetuista tiedoista.
                          </p>
                          {kayttoOikeudet && kayttoOikeudet.length > 0 ? (
                            <Controller
                              control={control}
                              name={`vuorovaikutusTilaisuudet.${index}.esitettavatYhteystiedot.yhteysHenkilot`}
                              render={({ field: { onChange, value, ...field } }) => (
                                <FormGroup
                                  label="Projektiin tallennetut henkilöt"
                                  inlineFlex
                                  errorMessage={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.esitettavatYhteystiedot?.message}
                                >
                                  {kayttoOikeudet?.map(({ nimi, kayttajatunnus }, index) => {
                                    const tunnuslista = value || [];
                                    return (
                                      <Fragment key={index}>
                                        <CheckBox
                                          label={nimi}
                                          onChange={(event) => {
                                            if (!event.target.checked) {
                                              onChange(tunnuslista.filter((tunnus) => tunnus !== kayttajatunnus));
                                            } else {
                                              onChange([...tunnuslista, kayttajatunnus]);
                                            }
                                          }}
                                          checked={tunnuslista.includes(kayttajatunnus)}
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
                        <Button
                          className="btn-remove-red"
                          onClick={(event) => {
                            event.preventDefault();
                            remove(index);
                          }}
                        >
                          Poista
                        </Button>
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

function TilaisuudenNimiJaAika(props: { index: number }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<VuorovaikutustilaisuusFormValues>();
  const today = dayjs().format();

  return (
    <>
      <TextInput
        label="Tilaisuuden nimi"
        {...register(`vuorovaikutusTilaisuudet.${props.index}.nimi`)}
        error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.nimi}
        maxLength={200}
      />
      <HassuStack direction={["column", "column", "row"]}>
        <DatePicker
          label="Päivämäärä *"
          {...register(`vuorovaikutusTilaisuudet.${props.index}.paivamaara`)}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.paivamaara}
          min={today}
        ></DatePicker>
        <TimePicker
          label="Alkaa *"
          {...register(`vuorovaikutusTilaisuudet.${props.index}.alkamisAika`)}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.alkamisAika}
        ></TimePicker>
        <TimePicker
          label="Päättyy *"
          {...register(`vuorovaikutusTilaisuudet.${props.index}.paattymisAika`)}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.paattymisAika}
        ></TimePicker>
      </HassuStack>
    </>
  );
}
