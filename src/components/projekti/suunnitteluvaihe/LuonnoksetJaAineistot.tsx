import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { useState } from "react";
import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import Notification, { NotificationType } from "@components/notification/Notification";
import IconButton from "@components/button/IconButton";
import HassuStack from "@components/layout/HassuStack";
import { Vuorovaikutus, VelhoAineisto } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import AineistojenValitseminenDialog from "./AineistojenValitseminenDialog";
import { Link, Stack } from "@mui/material";
import { VuorovaikutusFormValues } from "./SuunnitteluvaiheenVuorovaikuttaminen";
import AineistoNimiExtLink from "../AineistoNimiExtLink";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";

interface Props {
  vuorovaikutus: Vuorovaikutus | undefined;
  muokkaustila: boolean;
  setMuokkaustila: React.Dispatch<React.SetStateAction<boolean>>;
  saveForm: (e?: React.BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>;
}

export default function LuonnoksetJaAineistot({ saveForm, vuorovaikutus, muokkaustila, setMuokkaustila }: Props) {
  const { data: projekti } = useProjektiRoute();
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const [valitutAineistot, setValitutAineistot] = useState<VelhoAineisto[]>([]);

  const openAineistoDialog = () => setAineistoDialogOpen(true);
  const closeAineistoDialog = () => setAineistoDialogOpen(false);

  const julkinen = vuorovaikutus?.julkinen;

  const {
    control,
    register,
    formState: { errors, isDirty },
    reset,
  } = useFormContext<VuorovaikutusFormValues>();

  const { fields: aineistotFields, remove: removeAineistot } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.aineistot",
  });

  const {
    fields: videotFields,
    append: appendVideot,
    remove: removeVideot,
  } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.videot",
  });

  const esittelyaineistot = vuorovaikutus?.aineistot?.filter((aineisto) => aineisto.kategoria === "Yleinen");
  const suunnitelmaluonnokset = vuorovaikutus?.aineistot?.filter((aineisto) => aineisto.kategoria === "// TODO");

  return (
    <>
      {!muokkaustila && julkinen && (
        <Section>
          <Button style={{ float: "right" }} type="button" onClick={() => setMuokkaustila(true)}>
            Muokkaa
          </Button>
          <p className="vayla-label mb-5">Suunnitelmaluonnokset ja esittelyaineistot</p>
          {!!(vuorovaikutus?.videot && vuorovaikutus?.videot.length) && (
            <SectionContent>
              <div>Videoesittely</div>
              {vuorovaikutus.videot.map((video) => (
                <div key={video.url} style={{ marginTop: "0.4rem" }}>
                  <Link underline="none" href={video.url}>
                    {video.url}
                  </Link>
                </div>
              ))}
            </SectionContent>
          )}
          {!(vuorovaikutus?.aineistot && vuorovaikutus?.aineistot.length) && (
            <SectionContent>
              <p>Lisää suunnitelmalle luonnokset ja esittelyaineistot Muokkaa-painikkeesta.</p>
            </SectionContent>
          )}
          {!!(esittelyaineistot && esittelyaineistot.length) && (
            <SectionContent>
              <div>Esittelyaineistot</div>
              {esittelyaineistot.map((aineisto) => (
                <div key={aineisto.dokumenttiOid} style={{ marginTop: "0.4rem" }}>
                  <Link underline="none" href={aineisto.tiedosto || "#"}>
                    {aineisto.tiedosto}
                  </Link>
                </div>
              ))}
            </SectionContent>
          )}
          {!!(suunnitelmaluonnokset && suunnitelmaluonnokset.length) && (
            <SectionContent>
              <div>Suunnitelmaluonnokset</div>
              {suunnitelmaluonnokset.map((aineisto) => (
                <div key={aineisto.dokumenttiOid} style={{ marginTop: "0.4rem" }}>
                  <Link underline="none" href={aineisto.tiedosto || "#"}>
                    {aineisto.tiedosto}
                  </Link>
                </div>
              ))}
            </SectionContent>
          )}
          {vuorovaikutus?.suunnittelumateriaali?.nimi && (
            <SectionContent>
              <div>Muu esittelymateriaali</div>
              <div style={{ marginTop: "0.4rem" }}>{vuorovaikutus.suunnittelumateriaali.nimi}</div>
              <div style={{ marginTop: "0.4rem" }}>
                <Link underline="none" href={vuorovaikutus.suunnittelumateriaali.url}>
                  {vuorovaikutus.suunnittelumateriaali.url}
                </Link>
              </div>
            </SectionContent>
          )}
        </Section>
      )}
      <Section className={muokkaustila || !julkinen ? "" : "hidden"}>
        <SectionContent>
          {julkinen ? (
            <HassuStack className="mt-12" direction={["column", "column", "row"]} justifyContent="space-between">
              <h4 style={{ display: "inline" }} className="vayla-small-title">
                Suunnitelmaluonnokset ja esittelyaineistot
              </h4>
              <HassuStack direction={["column", "column", "row"]}>
                <Button
                  primary
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    saveForm();
                  }}
                >
                  Päivitä
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    if (isDirty) reset();
                    setMuokkaustila(false);
                  }}
                >
                  Peruuta
                </Button>
              </HassuStack>
            </HassuStack>
          ) : (
            <h4 className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h4>
          )}
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
          <p>Aineistoille tulee valita kategoria / otsikko, jonka alla ne esitetään palvelun julkisella puolella. </p>
          <p>
            Aineistojen järjestys kunkin otsikon alla määräytyy listan järjestyksen mukaan. Voit vaihtaa järjestystä
            tarttumalla hiirellä raahaus-ikonista ja siirtämällä rivin paikkaa.{" "}
          </p>
          <>
            {!!aineistotFields.length && <p>Aineistot: </p>}
            {projekti?.oid &&
              aineistotFields.map((aineisto, index) => (
                <Stack direction="row" alignItems="center" key={aineisto.id}>
                  <AineistoNimiExtLink
                    key={aineisto.id}
                    aineistoNimi={
                      vuorovaikutus?.aineistot?.find((a) => a.dokumenttiOid === aineisto.dokumenttiOid)?.tiedosto ||
                      valitutAineistot.find(({ oid }) => oid === aineisto.dokumenttiOid)?.tiedosto ||
                      `oid-${aineisto.dokumenttiOid}`
                    }
                    aineistoOid={aineisto.dokumenttiOid}
                    projektiOid={projekti.oid}
                  />
                  <IconButton
                    onClick={(event) => {
                      event.preventDefault();
                      removeAineistot(index);
                    }}
                    icon="trash"
                  />
                </Stack>
              ))}
          </>
          <Button type="button" onClick={openAineistoDialog}>
            Tuo Aineistoja
          </Button>
          <AineistojenValitseminenDialog
            open={aineistoDialogOpen}
            onClose={closeAineistoDialog}
            updateValitutAineistot={setValitutAineistot}
          />
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
