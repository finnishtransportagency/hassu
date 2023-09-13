import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import IconButton from "@components/button/IconButton";
import HassuStack from "@components/layout/HassuStack";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";

import lowerCase from "lodash/lowerCase";
import { defaultEmptyLokalisoituLink, SuunnittelunPerustiedotFormValues } from "../Perustiedot";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import Section from "@components/layout/Section2";

export default function EnnaltaKuvattuVideoesittely() {
  const { data: projekti } = useProjekti();

  const { control, register, formState, trigger } = useFormContext<SuunnittelunPerustiedotFormValues>();

  const {
    fields: videotFields,
    append: appendVideot,
    remove: removeVideot,
  } = useFieldArray({
    control,
    name: "vuorovaikutusKierros.videot",
  });

  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(projekti?.kielitiedot);

  return (
    <Section noDivider>
      <h4 className="vayla-small-title">Ennalta kuvattu videoesittely</h4>
      <p>
        Ennalta kuvatun videoesittelyn lisääminen on vapaaehtoista. Esittelyvideo tulee olla ladattuna erilliseen videojulkaisupalveluun
        (esim. Youtube) ja videon katselulinkki tuodaan sille tarkoitettuun kenttään.
      </p>
      {videotFields.map((field, index) => (
        <HassuStack key={field.id} direction={"row"}>
          {ensisijainenKaannettavaKieli && (
            <TextInput
              style={{ width: "100%" }}
              key={field.id + ensisijainenKaannettavaKieli}
              {...register(`vuorovaikutusKierros.videot.${index}.${ensisijainenKaannettavaKieli}.url`, {
                onChange: () => {
                  if (toissijainenKaannettavaKieli) {
                    trigger(`vuorovaikutusKierros.videot.${index}.${toissijainenKaannettavaKieli}.url`);
                  }
                },
              })}
              label={`Linkki videoon ensisijaisella kielellä ${lowerCase(ensisijainenKaannettavaKieli)}`}
              error={(formState.errors as any)?.vuorovaikutusKierros?.videot?.[index]?.[ensisijainenKaannettavaKieli]?.url}
            />
          )}

          {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
            <TextInput
              style={{ width: "100%" }}
              key={field.id + toissijainenKaannettavaKieli}
              {...register(`vuorovaikutusKierros.videot.${index}.${toissijainenKaannettavaKieli}.url`, {
                onChange: () => {
                  trigger(`vuorovaikutusKierros.videot.${index}.${ensisijainenKaannettavaKieli}.url`);
                },
              })}
              label={`Linkki videoon toissijaisella kielellä ${lowerCase(toissijainenKaannettavaKieli)}`}
              error={(formState.errors as any)?.vuorovaikutusKierros?.videot?.[index]?.[toissijainenKaannettavaKieli]?.url}
            />
          )}
          {!!index && (
            <div>
              <div className="hidden lg:block lg:mt-8">
                <IconButton
                  icon="trash"
                  onClick={(event) => {
                    event.preventDefault();
                    removeVideot(index);
                  }}
                />
              </div>
              <div className="block lg:hidden">
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    removeVideot(index);
                  }}
                  endIcon="trash"
                >
                  Poista
                </Button>
              </div>
            </div>
          )}
        </HassuStack>
      ))}
      <Button
        id="append_videoesittelyt_button"
        onClick={(event) => {
          event.preventDefault();
          appendVideot(defaultEmptyLokalisoituLink(null, projekti?.kielitiedot));
        }}
      >
        Lisää uusi +
      </Button>
    </Section>
  );
}
