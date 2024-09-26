import { useFieldArray, useFormContext } from "react-hook-form";
import { ReactElement } from "react";
import { Kielitiedot } from "@services/api";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { defaultEmptyLokalisoituLink, SuunnittelunPerustiedotFormValues } from ".";
import TextInput from "@components/form/TextInput";
import IconButton from "@components/button/IconButton";
import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import ListWithAlternatingBGColors from "@components/ListWithAlternatingBGColors";
import { Box } from "@mui/system";
import { label } from "src/util/textUtil";

type Props = {
  kielitiedot: Kielitiedot | null | undefined;
};

export default function MuuEsittelymateriaali({ kielitiedot }: Props): ReactElement {
  const {
    register,
    formState: { errors },
    trigger,
    control,
  } = useFormContext<SuunnittelunPerustiedotFormValues>();

  const {
    fields: suunnittelumateriaaliFields,
    append: appendSuunnittelumateriaalit,
    remove: removeSuunnittelumateriaalit,
  } = useFieldArray({
    control,
    name: "vuorovaikutusKierros.suunnittelumateriaali",
  });

  if (!kielitiedot) return <></>;
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  return (
    <Section>
      <h4 className="vayla-small-title">Muut esittelymateriaalit</h4>
      <p>
        Muu esittelymateraali on järjestelmän ulkopuolelle julkaistua suunnitelmaan liittyvää materiaalia. Muun esittelymateriaalin
        lisääminen on vapaaehtoista.
      </p>
      <ListWithAlternatingBGColors
        styles={{ margin: 0 }}
        listItemStyles={
          toissijainenKaannettavaKieli
            ? {
                padding: "16px",
              }
            : { padding: "5px", paddingTop: "16px", paddingRight: "16px" }
        }
      >
        {suunnittelumateriaaliFields.map((field, index) => (
          <div key={field.id}>
            <Box sx={{ width: { lg: "80%", md: "100%" }, display: "inline-block" }}>
              {ensisijainenKaannettavaKieli && (
                <div className="pb-4 mb-4">
                  {toissijainenKaannettavaKieli && (
                    <h5 className="vayla-smallest-title">
                      {label({
                        label: "Muu esittelymateriaali",
                        inputLanguage: ensisijainenKaannettavaKieli,
                        kielitiedot,
                      })}
                    </h5>
                  )}
                  <TextInput
                    style={{ width: "100%" }}
                    label={label({
                      label: "Linkin kuvaus",
                      inputLanguage: ensisijainenKaannettavaKieli,
                      kielitiedot,
                    })}
                    {...register(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${ensisijainenKaannettavaKieli}.nimi`, {
                      onChange: () => {
                        trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${ensisijainenKaannettavaKieli}.url`);
                        if (toissijainenKaannettavaKieli) {
                          trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${toissijainenKaannettavaKieli}`);
                        }
                      },
                    })}
                    error={(errors as any)?.vuorovaikutusKierros?.suunnittelumateriaali?.[index]?.[ensisijainenKaannettavaKieli]?.nimi}
                  />
                  <TextInput
                    style={{ width: "100%" }}
                    label={label({
                      label: "Linkki muihin esittelyaineistoihin",
                      inputLanguage: ensisijainenKaannettavaKieli,
                      kielitiedot,
                    })}
                    {...register(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${ensisijainenKaannettavaKieli}.url`, {
                      onChange: () => {
                        trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${ensisijainenKaannettavaKieli}.nimi`);
                        if (toissijainenKaannettavaKieli) {
                          trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${toissijainenKaannettavaKieli}`);
                        }
                      },
                    })}
                    error={(errors as any)?.vuorovaikutusKierros?.suunnittelumateriaali?.[index]?.[ensisijainenKaannettavaKieli]?.url}
                  />
                </div>
              )}

              {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
                <div className="pb-4 mb-4">
                  <h5 className="vayla-smallest-title">
                    {label({
                      label: "Muu esittelymateriaali",
                      inputLanguage: toissijainenKaannettavaKieli,
                      kielitiedot,
                    })}
                  </h5>
                  <TextInput
                    style={{ width: "100%" }}
                    label={label({
                      label: "Linkin kuvaus",
                      inputLanguage: toissijainenKaannettavaKieli,
                      kielitiedot,
                    })}
                    {...register(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${toissijainenKaannettavaKieli}.nimi`, {
                      onChange: () => {
                        trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${toissijainenKaannettavaKieli}.url`);
                        trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${ensisijainenKaannettavaKieli}`);
                      },
                    })}
                    error={(errors as any)?.vuorovaikutusKierros?.suunnittelumateriaali?.[index]?.[toissijainenKaannettavaKieli]?.nimi}
                  />
                  <TextInput
                    style={{ width: "100%" }}
                    label={label({
                      label: "Linkki muihin esittelyaineistoihin",
                      inputLanguage: toissijainenKaannettavaKieli,
                      kielitiedot,
                    })}
                    {...register(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${toissijainenKaannettavaKieli}.url`, {
                      onChange: () => {
                        trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${toissijainenKaannettavaKieli}.nimi`);
                        trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${ensisijainenKaannettavaKieli}`);
                      },
                    })}
                    error={(errors as any)?.vuorovaikutusKierros?.suunnittelumateriaali?.[index]?.[toissijainenKaannettavaKieli]?.url}
                  />
                </div>
              )}
            </Box>

            {!!index && (
              <Box sx={{ float: { lg: "right", md: "none" }, display: "inline-block" }}>
                <div className="hidden lg:block">
                  <IconButton
                    icon="trash"
                    onClick={(event) => {
                      event.preventDefault();
                      removeSuunnittelumateriaalit(index);
                    }}
                  />
                </div>
                <div className="block lg:hidden">
                  <Button
                    className="mb-8 mt-4"
                    onClick={(event) => {
                      event.preventDefault();
                      removeSuunnittelumateriaalit(index);
                    }}
                    endIcon="trash"
                  >
                    Poista
                  </Button>
                </div>
              </Box>
            )}
          </div>
        ))}
      </ListWithAlternatingBGColors>

      <Button
        id="append_videoesittelyt_button"
        onClick={(event) => {
          event.preventDefault();
          appendSuunnittelumateriaalit(defaultEmptyLokalisoituLink(null, kielitiedot));
        }}
      >
        Lisää uusi +
      </Button>
    </Section>
  );
}
