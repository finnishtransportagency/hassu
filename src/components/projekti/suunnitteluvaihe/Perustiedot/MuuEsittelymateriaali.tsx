import { useFieldArray, useFormContext } from "react-hook-form";
import { ReactElement } from "react";
import lowerCase from "lodash/lowerCase";
import { Kielitiedot } from "@services/api";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { defaultEmptyLokalisoituLink, SuunnittelunPerustiedotFormValues } from ".";
import TextInput from "@components/form/TextInput";
import HassuStack from "@components/layout/HassuStack";
import IconButton from "@components/button/IconButton";
import Button from "@components/button/Button";
import Section from "@components/layout/Section2";

type Props = {
  kielitiedot: Kielitiedot | null | undefined;
};

export default function MuuEsittelymateriaali({ kielitiedot }: Props): ReactElement {
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

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

  return (
    <Section>
      <h4 className="vayla-small-title">Muut esittelymateriaalit</h4>
      <p>
        Muu esittelymateraali on järjestelmän ulkopuolelle julkaistua suunnitelmaan liittyvää materiaalia. Muun esittelymateriaalin
        lisääminen on vapaaehtoista.
      </p>

      {suunnittelumateriaaliFields.map((field, index) => (
        <div key={field.id}>
          {ensisijainenKaannettavaKieli && (
            <div className="pb-4 mb-4">
              {toissijainenKaannettavaKieli && (
                <h5 className="vayla-smallest-title">{`Muu esittelymateriaali ensisijaisella kielellä (${lowerCase(
                  ensisijainenKaannettavaKieli
                )})`}</h5>
              )}
              <TextInput
                style={{ width: "100%" }}
                label={`Linkin kuvaus ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)})`}
                {...register(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${ensisijainenKaannettavaKieli}.nimi`, {
                  onChange: () => {
                    trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${ensisijainenKaannettavaKieli}.url`);
                    if (toissijainenKaannettavaKieli) {
                      trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${toissijainenKaannettavaKieli}`);
                    }
                  },
                })}
                error={(errors as any)?.vuorovaikutusKierros?.suunnittelumateriaali?.[ensisijainenKaannettavaKieli]?.nimi}
              />
              <TextInput
                style={{ width: "100%" }}
                label={`Linkki muihin esittelyaineistoihin ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)})`}
                {...register(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${ensisijainenKaannettavaKieli}.url`, {
                  onChange: () => {
                    trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${ensisijainenKaannettavaKieli}.nimi`);
                    if (toissijainenKaannettavaKieli) {
                      trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${toissijainenKaannettavaKieli}`);
                    }
                  },
                })}
                error={(errors as any)?.vuorovaikutusKierros?.suunnittelumateriaali?.[ensisijainenKaannettavaKieli]?.url}
              />
            </div>
          )}

          {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
            <div className="pb-4 mb-4">
              <h5 className="vayla-smallest-title">{`Muu esittelymateriaali toissijaisella kielellä (${lowerCase(
                toissijainenKaannettavaKieli
              )})`}</h5>
              <TextInput
                style={{ width: "100%" }}
                label={`Linkin kuvaus toissijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)})`}
                {...register(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${toissijainenKaannettavaKieli}.nimi`, {
                  onChange: () => {
                    trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${toissijainenKaannettavaKieli}.url`);
                    trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${ensisijainenKaannettavaKieli}`);
                  },
                })}
                error={(errors as any)?.vuorovaikutusKierros?.suunnittelumateriaali?.[toissijainenKaannettavaKieli]?.nimi}
              />
              <TextInput
                style={{ width: "100%" }}
                label={`Linkki muihin esittelyaineistoihin toissijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)})`}
                {...register(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${toissijainenKaannettavaKieli}.url`, {
                  onChange: () => {
                    trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${toissijainenKaannettavaKieli}.nimi`);
                    trigger(`vuorovaikutusKierros.suunnittelumateriaali.${index}.${ensisijainenKaannettavaKieli}`);
                  },
                })}
                error={(errors as any)?.vuorovaikutusKierros?.suunnittelumateriaali?.[toissijainenKaannettavaKieli]?.url}
              />
            </div>
          )}
          {!!index && (
            <div>
              <div className="hidden lg:block lg:mt-8">
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
                  onClick={(event) => {
                    event.preventDefault();
                    removeSuunnittelumateriaalit(index);
                  }}
                  endIcon="trash"
                >
                  Poista
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
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
