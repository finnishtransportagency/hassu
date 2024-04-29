import React, { useState, VFC, useEffect } from "react";
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

const MuistuttajienMuokkaus: VFC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const [initialSearchResponses, setInitialSearchResponses] = useState<InitialSearchResponses | null>(null);
  const { withLoadingSpinner } = useLoadingSpinner();
  const api = useApi();
  const { data: projektinTiedottaminen } = useProjektinTiedottaminen();

  useEffect(() => {
    withLoadingSpinner(
      (async () => {
        const suomifi = await api.haeMuistuttajat(projekti.oid, false, undefined, 0, PAGE_SIZE);
        const muut = await api.haeMuistuttajat(projekti.oid, true, undefined, 0, undefined);
        setInitialSearchResponses({ muut, suomifi });
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
            Muistuttajia on yhteensä <b>{projektinTiedottaminen?.muistuttajaMaara ?? 0} henkilöä</b>.
          </p>
        </GrayBackgroundText>
        <p>
          Tunnistautuneiden muistuttajien yhteystiedot kerätään järjestelmään ja heille lähetetään kuulutus hyväksymispäätöksestä
          järjestelmän kautta automaattisesti. Tämän sivun kuulutuksen vastaanottajalista viedään automaattisesti asianhallintaan, kun
          kuulutus hyväksytään julkaistavaksi. Myös muilla tavoin tiedotettavien muistuttajien lista viedään samalla asianhallintaan.
        </p>
      </Section>
      {initialSearchResponses && <FormContents projekti={projekti} initialSearchResponses={initialSearchResponses} />}
    </>
  );
};

const PAGE_SIZE = 25;
