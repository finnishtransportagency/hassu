// import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { useState } from "react";
import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import Notification, { NotificationType } from "@components/notification/Notification";
import IconButton from "@components/button/IconButton";
import HassuStack from "@components/layout/HassuStack";
import { TallennaProjektiInput, VuorovaikutusInput, Vuorovaikutus } from "@services/api";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import AineistojenValitseminenDialog from "./AineistojenValitseminenDialog";
import { Link } from "@mui/material";

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
  vuorovaikutus: Vuorovaikutus | undefined;
  avaaHyvaksymisDialogi: () => void;
}

export default function LuonnoksetJaAineistot<T extends FormValues>({ useFormReturn, vuorovaikutus, avaaHyvaksymisDialogi}: Props<T>) {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const [muokkaustila, setMuokkaustila] = useState(false);

  const openAineistoDialog = () => setAineistoDialogOpen(true);
  const closeAineistoDialog = () => setAineistoDialogOpen(false);

  const julkinen = vuorovaikutus?.julkinen;

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

  const esittelyaineistot = vuorovaikutus?.aineistot?.filter(() => true);
  const suunnitelmaluonnokset = vuorovaikutus?.aineistot?.filter(() => true);

  return (
    <>
      {(!muokkaustila && julkinen) &&
        <Section>
          <Button style={{ float: "right" }} type="submit" onClick={() => setMuokkaustila(true)}>
            Muokkaa
          </Button>
          <p className="vayla-label mb-5">Suunnitelmaluonnokset ja esittelyaineistot</p>
          {!!(vuorovaikutus?.videot && vuorovaikutus?.videot.length) &&
            <SectionContent>
              <div>Videoesittely</div>
              {vuorovaikutus.videot.map(video => <div key={video.url}><Link underline="none" href={video.url}>{video.url}</Link></div>)}
            </SectionContent>
          }
          {!(vuorovaikutus?.aineistot && vuorovaikutus?.aineistot.length) &&
            <SectionContent>
              <p>Lisää suunnitelmalle luonnokset ja esittelyaineistot Muokkaa-painikkeesta.</p>
            </SectionContent>
          }
          {!!(esittelyaineistot && esittelyaineistot.length) &&
            <SectionContent>
              <div>Esittelyaineistot</div>
              {esittelyaineistot.map(aineisto => <div key={aineisto.dokumenttiOid}><Link underline="none" href={aineisto.tiedosto || "#"}>{aineisto.tiedosto}</Link></div>)}
            </SectionContent>
          }
          {!!(suunnitelmaluonnokset && suunnitelmaluonnokset.length) &&
            <SectionContent>
              <div>Suunnitelmaluonnokset</div>
              {suunnitelmaluonnokset.map(aineisto => <div key={aineisto.dokumenttiOid}><Link underline="none" href={aineisto.tiedosto || "#"}>{aineisto.tiedosto}</Link></div>)}
            </SectionContent>
          }
          {vuorovaikutus?.suunnittelumateriaali?.nimi &&
            <SectionContent>
              <div>Muu esittelymateriaali</div>
              <div>{vuorovaikutus.suunnittelumateriaali.nimi}</div>
              <div><Link underline="none" href={vuorovaikutus.suunnittelumateriaali.url}>{vuorovaikutus.suunnittelumateriaali.url}</Link></div>
            </SectionContent>
          }
        </Section>
      }
      <Section className={(muokkaustila || !julkinen) ? "" : "hidden"}>
        <SectionContent>
          {julkinen
            ? <HassuStack direction={["column", "column", "row"]} justifyContent="space-between" >
                <h4 style={{ display: "inline" }} className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h4>
                <HassuStack direction={["column", "column", "row"]}>
                  <Button primary type="submit" onClick={(e) => {
                    e.preventDefault();
                    setMuokkaustila(false);
                    avaaHyvaksymisDialogi();
                  }}>
                    Päivitä
                  </Button>
                  <Button onClick={(e) => {
                    e.preventDefault();
                    setMuokkaustila(false);
                  }}>
                    Peruuta
                  </Button>
                </HassuStack>
              </HassuStack>
            : <h4 className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h4>
          }
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
    </>
  );
}
