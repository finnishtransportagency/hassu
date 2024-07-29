import React, { useState, FunctionComponent, useEffect } from "react";
import Section from "@components/layout/Section2";
import { H2, H3 } from "@components/Headings";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";
import { useProjektinTiedottaminen } from "src/hooks/useProjektinTiedottaminen";
import { GrayBackgroundText } from "@components/projekti/GrayBackgroundText";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { FormContents, InitialSearchResponses } from "@components/projekti/tiedottaminen/MuistuttajienMuokkausLomake";

export default function MuistuttajienMuokkausSivu() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <MuistuttajienMuokkaus projekti={projekti} />}
    </ProjektiConsumer>
  );
}

const MuistuttajienMuokkaus: FunctionComponent<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const [initialSearchResponses, setInitialSearchResponses] = useState<InitialSearchResponses | null>(null);
  const { withLoadingSpinner } = useLoadingSpinner();
  const api = useApi();
  const { data: projektinTiedottaminen } = useProjektinTiedottaminen();

  useEffect(() => {
    withLoadingSpinner(
      (async () => {
        // Hae ensimmäiset 25 suomi.fi tiedotettavaa
        const suomifi = await api.haeMuistuttajat(projekti.oid, false, undefined, 0, PAGE_SIZE);
        // Hae ensimmäiset kaikki muulla tavoin tiedotettavat
        const muut = await api.haeMuistuttajat(projekti.oid, true, undefined, 0, undefined);
        setInitialSearchResponses({ muut, suomifi });
      })()
    );
  }, [api, projekti.oid, withLoadingSpinner]);

  return (
    <>
      <Section noDivider>
        <H2 variant="h1">Muokkaa muistuttajia</H2>
        <H3 variant="lead">{projekti.velho.nimi}</H3>
        <GrayBackgroundText>
          <p>
            Muistuttajia on yhteensä <b>{projektinTiedottaminen?.muistuttajaMaara ?? 0} henkilöä</b>.
          </p>
        </GrayBackgroundText>
        <p>
          Voit muokata, lisätä tai poistaa muistuttajatietoja. Huomaa, että muutokset tulevat voimaan vasta tallennettuasi muutokset.
          Suomi.fi -palvelun kautta tiedotettavien muistuttajien tietoja ei voi muokata, mutta vastaanottajia voi poistaa. Muulla tavalla
          tiedotettavien yhteystietoja on mahdollisuus muokata ja vastaanottajia poistaa, jonka lisäksi voit lisätä uusia vastaanottajia.
        </p>
      </Section>
      {initialSearchResponses && <FormContents projekti={projekti} initialSearchResponses={initialSearchResponses} />}
    </>
  );
};

const PAGE_SIZE = 25;
