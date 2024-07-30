import React, { useState, FunctionComponent, useEffect } from "react";
import Section from "@components/layout/Section2";
import { H2, H3 } from "@components/Headings";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";
import { useProjektinTiedottaminen } from "src/hooks/useProjektinTiedottaminen";
import { GrayBackgroundText } from "@components/projekti/GrayBackgroundText";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { FormContents, InitialSearchResponses } from "@components/projekti/tiedottaminen/OmistajienMuokkausLomake";

export default function KiinteistonOmistajienMuokkausSivu() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <KiinteistonOmistajienMuokkaus projekti={projekti} />}
    </ProjektiConsumer>
  );
}

const KiinteistonOmistajienMuokkaus: FunctionComponent<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const [initialSearchResponses, setInitialSearchResponses] = useState<InitialSearchResponses | null>(null);
  const { withLoadingSpinner } = useLoadingSpinner();
  const api = useApi();
  const { data: projektinTiedottaminen } = useProjektinTiedottaminen();

  useEffect(() => {
    withLoadingSpinner(
      (async () => {
        const suomifi = await api.haeKiinteistonOmistajat(projekti.oid, false, undefined, 0, PAGE_SIZE);
        const muut = await api.haeKiinteistonOmistajat(projekti.oid, true, undefined, 0, PAGE_SIZE, false, true);
        const lisatyt = await api.haeKiinteistonOmistajat(projekti.oid, true, undefined, 0, undefined, true);
        setInitialSearchResponses({ muut, suomifi, lisatyt });
      })()
    );
  }, [api, projekti.oid, withLoadingSpinner]);

  return (
    <>
      <Section noDivider>
        <H2 variant="h1">Muokkaa kiinteistönomistajatietoja</H2>
        <H3 variant="lead">{projekti.velho.nimi}</H3>
        <GrayBackgroundText>
          <p>
            Kiinteistönomistajia on listalla yhteensä <b>{projektinTiedottaminen?.kiinteistonomistajaMaara ?? "x"} henkilöä</b>.
            Kiinteistötunnuksia on {projektinTiedottaminen?.kiinteistotunnusMaara ?? 0}.
          </p>
        </GrayBackgroundText>
        <p>
          Voit muokata, lisätä tai poistaa kiinteistönomistajatietoja. Huomaa, että muutokset tulevat voimaan vasta tallennettuasi
          muutokset. Suomi.fi -palvelun kautta tiedotettavien kiinteistönomistajien tietoja ei voi muokata, mutta vastaanottajia voi
          poistaa. Muulla tavalla tiedotettavien yhteystietoja on mahdollisuus muokata ja vastaanottajia poistaa, jonka lisäksi voit lisätä
          uusia vastaanottajia.
        </p>
      </Section>
      {initialSearchResponses && <FormContents projekti={projekti} initialSearchResponses={initialSearchResponses} />}
    </>
  );
};

const PAGE_SIZE = 25;
