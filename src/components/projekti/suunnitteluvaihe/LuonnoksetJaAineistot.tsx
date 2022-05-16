// import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { useState } from "react";
import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import Notification, { NotificationType } from "@components/notification/Notification";
import IconButton from "@components/button/IconButton";
import HassuStack from "@components/layout/HassuStack";
import { TallennaProjektiInput, VuorovaikutusInput } from "@services/api";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import AineistojenValitseminenDialog from "./AineistojenValitseminenDialog";

type Videot = Pick<VuorovaikutusInput, "videot">;
type SuunnitteluMateriaali = Pick<VuorovaikutusInput, "suunnittelumateriaali">;

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  suunnitteluVaihe: {
    vuorovaikutus: Videot | SuunnitteluMateriaali;
  };
};

interface Props<T> {
  useFormReturn: UseFormReturn<T>;
}

export default function LuonnoksetJaAineistot<T extends FormValues>({ useFormReturn }: Props<T>) {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);

  const openAineistoDialog = () => setAineistoDialogOpen(true);
  const closeAineistoDialog = () => setAineistoDialogOpen(false);

  // const context = useFormContext();

  const {
    control,
    register,
    formState: { errors },
  } = useFormReturn as UseFormReturn<FormValues>;

  const {
    fields: videotFields,
    append: appendVideot,
    remove: removeVideot,
  } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.videot",
  });

  return (
    <Section>
      <SectionContent>
        <h4 className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h4>
        <p>
          Esittelyvideo tulee olla ladattuna erilliseen videojulkaisupalveluun (esim. Youtube) ja videon katselulinkki
          tuodaan sille tarkoitettuun kenttään. Luonnokset ja muut materiaalit tuodaan Projektivelhosta.
          Suunnitelmaluonnokset ja esittelyaineistot on mahdollista. Suunnitelmaluonnokset ja aineistot julkaistaan
          palvelun julkisella puolella vuorovaikutuksen julkaisupäivänä.{" "}
        </p>
        <Notification type={NotificationType.INFO_GRAY}>
          Huomioithan, että suunnitelmaluonnoksien ja esittelyaineistojen tulee täyttää saavutettavuusvaatimukset.{" "}
        </Notification>
      </SectionContent>
      <SectionContent>
        <h5 className="vayla-smallest-title">Suunnitelmaluonnokset ja esittelyaineistot</h5>
        <Button type="button" onClick={openAineistoDialog}>
          Tuo Aineistoja
        </Button>
        <AineistojenValitseminenDialog open={aineistoDialogOpen} onClose={closeAineistoDialog} />
      </SectionContent>
      <SectionContent>
        <h5 className="vayla-smallest-title">Ennalta kuvattu videoesittely</h5>
        {videotFields.map((field, index) => (
          <HassuStack key={field.id} direction={"row"}>
            <TextInput
              style={{ width: "100%" }}
              key={field.id}
              {...register(`suunnitteluVaihe.vuorovaikutus.videot.${index}.url`)}
              label="Linkki videoon"
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.videot?.[index]?.url}
            />
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
          onClick={(event) => {
            event.preventDefault();
            appendVideot({ nimi: "", url: "" });
          }}
        >
          Lisää uusi +
        </Button>
      </SectionContent>
      <SectionContent>
        <h5 className="vayla-smallest-title">Muut esittelymateriaalit</h5>
        <p>
          Muu esittelymateraali on järjestelmän ulkopuolelle julkaistua suunnitelmaan liittyvää materiaalia. Muun
          esittelymateriaalin lisääminen on vapaaehtoista.{" "}
        </p>
        <TextInput
          style={{ width: "100%" }}
          label="Linkin kuvaus"
          {...register(`suunnitteluVaihe.vuorovaikutus.suunnittelumateriaali.nimi`)}
          error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.suunnittelumateriaali?.nimi}
        />
        <TextInput
          style={{ width: "100%" }}
          label="Linkki muihin esittelyaineistoihin"
          {...register(`suunnitteluVaihe.vuorovaikutus.suunnittelumateriaali.url`)}
          error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.suunnittelumateriaali?.url}
        />
      </SectionContent>
    </Section>
  );
}
