import React from "react";
import Section from "@components/layout/Section";
import Button from "@components/button/Button";
import { VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu } from "@services/api";
import HassuStack from "@components/layout/HassuStack";
import { VuorovaikutusFormValues } from "../VuorovaikutusKierros";
import { useFormContext } from "react-hook-form";
import Lukutila from "./Lukutila";
import MuokkaustilainenLomake from "./MuokkaustilainenLomake";
import Notification, { NotificationType } from "@components/notification/Notification";

interface Props {
  saveForm: (e?: React.BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>;
  vuorovaikutus: Pick<VuorovaikutusKierros | VuorovaikutusKierrosJulkaisu, "suunnitelmaluonnokset" | "esittelyaineistot">;
  muokkaustila: boolean;
  setMuokkaustila: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function JulkinenLuonnoksetJaAineistotLomake({ saveForm, vuorovaikutus, muokkaustila, setMuokkaustila }: Props) {
  const { formState, reset } = useFormContext<VuorovaikutusFormValues>();

  return (
    <>
      <Section>
        {muokkaustila ? (
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
                  if (formState.isDirty) reset();
                  setMuokkaustila(false);
                }}
              >
                Peruuta
              </Button>
            </HassuStack>
          </HassuStack>
        ) : (
          <>
            <Button className="mb-5" style={{ float: "right" }} type="button" onClick={() => setMuokkaustila(true)}>
              Muokkaa
            </Button>
            <p className="vayla-label mb-5">Suunnitelmaluonnokset ja esittelyaineistot</p>
          </>
        )}
        <p>
          Esittelyvideo tulee olla ladattuna erilliseen videojulkaisupalveluun (esim. Youtube) ja videon katselulinkki tuodaan sille
          tarkoitettuun kenttään. Luonnokset ja muut materiaalit tuodaan Projektivelhosta. Suunnitelmaluonnokset ja esittelyaineistot on
          mahdollista. Suunnitelmaluonnokset ja aineistot julkaistaan palvelun julkisella puolella vuorovaikutuksen julkaisupäivänä.
        </p>
        <Notification type={NotificationType.INFO_GRAY}>
          Huomioithan, että suunnitelmaluonnoksien ja esittelyaineistojen tulee täyttää saavutettavuusvaatimukset.
        </Notification>
      </Section>
      <Section>
        <MuokkaustilainenLomake hidden={!muokkaustila} vuorovaikutus={vuorovaikutus} />
        {!muokkaustila && <Lukutila vuorovaikutus={vuorovaikutus} />}
      </Section>
    </>
  );
}
