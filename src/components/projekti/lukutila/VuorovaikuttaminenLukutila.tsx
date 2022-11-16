import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import React, { ReactElement, useMemo } from "react";
import { formatDate } from "../../../util/dateUtils";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import VuorovaikutusPaivamaaraJaTiedotLukutila from "./komponentit/VuorovaikutusPaivamaaraJaTiedotLukutila";
import VuorovaikutusMahdollisuudetLukutila from "./komponentit/VuorovaikutusMahdollisuudetLukutila";
import IlmoituksenVastaanottajatLukutila from "./komponentit/VuorovaikutusIlmoituksenVastaanottajatLukutila";
import StandardiYhteystiedotListana from "../common/StandardiYhteystiedotListana";
import ExtLink from "@components/ExtLink";

interface Props {
  vuorovaikutusnro: number;
}

export default function SuunnitteluvaiheenVuorovaikuttaminen({ vuorovaikutusnro }: Props): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();
  return (
    <>
      {projekti && kirjaamoOsoitteet && (
        <SuunnitteluvaiheenVuorovaikuttaminenForm vuorovaikutusnro={vuorovaikutusnro} projekti={projekti} />
      )}
    </>
  );
}

type SuunnitteluvaiheenVuorovaikuttaminenFormProps = {
  projekti: ProjektiLisatiedolla;
  vuorovaikutusnro: number;
};

function SuunnitteluvaiheenVuorovaikuttaminenForm({
  vuorovaikutusnro,
  projekti,
}: SuunnitteluvaiheenVuorovaikuttaminenFormProps): ReactElement {
  const vuorovaikutus = useMemo(
    () =>
      projekti?.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
        return v.vuorovaikutusNumero === vuorovaikutusnro;
      }),
    [projekti, vuorovaikutusnro]
  );

  const aloituskuulutusjulkaisu = useMemo(() => {
    return projekti?.aloitusKuulutusJulkaisu;
  }, [projekti]);

  if (!(aloituskuulutusjulkaisu && vuorovaikutus)) {
    return <></>;
  }

  const velhoURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + projekti.oid;

  return (
    <>
      <Section className="mb-4">
        <SectionContent>
          <h3 className="vayla-title">Vuorovaikuttaminen</h3>
        </SectionContent>
        <VuorovaikutusPaivamaaraJaTiedotLukutila aloituskuulutusjulkaisu={aloituskuulutusjulkaisu} vuorovaikutus={vuorovaikutus} />
      </Section>
      <VuorovaikutusMahdollisuudetLukutila projekti={projekti} vuorovaikutus={vuorovaikutus} />
      <Section>
        <p className="vayla-label">Suunnitelmaluonnokset ja esittelyaineistot</p>
        <p>
          Suunnitelmaluonnokset ja esittelyaineistot löytyvät <ExtLink href={velhoURL}>Projektivelhosta</ExtLink>.
        </p>
      </Section>
      <Section>
        <SectionContent>
          <p className="vayla-label">Vuorovaikuttamisen yhteyshenkilöt</p>
          <p></p>
          <StandardiYhteystiedotListana
            standardiYhteystiedot={vuorovaikutus.esitettavatYhteystiedot}
            projekti={projekti}
            pakotaProjariTaiKunnanEdustaja={true}
          />
        </SectionContent>
        <SectionContent>
          <p className="vayla-label">Kutsu vuorovaikutamiseen julkisella puolella</p>
          <p>
            Linkki julkiselle puolelle on muodostettu vuorovaikuttamisen julkaisupäivänä. Julkaisupäivä{" "}
            {formatDate(vuorovaikutus.vuorovaikutusJulkaisuPaiva)}.
          </p>
        </SectionContent>
        <SectionContent>
          <p className="vayla-label">Ladattavat kutsut ja ilmoitukset</p>
          <p>Kuulutukset löytyvät asianhallinnasta.</p>
        </SectionContent>
      </Section>
      <IlmoituksenVastaanottajatLukutila vuorovaikutus={vuorovaikutus} />
    </>
  );
}
