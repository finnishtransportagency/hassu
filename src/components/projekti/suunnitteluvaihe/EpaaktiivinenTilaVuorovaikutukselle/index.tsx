import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import React, { ReactElement, useMemo } from "react";
import { formatDate } from "../../../../util/dateUtils";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import VuorovaikutusPaivamaaraJaTiedotLukutila from "../komponentit/VuorovaikutusPaivamaaraJaTiedotLukutila";
import VuorovaikutusMahdollisuudet from "../komponentit/VuorovaikutusMahdollisuudet";
import IlmoituksenVastaanottajatLukutila from "../komponentit/IlmoituksenVastaanottajatLukutila";
import ExtLink from "@components/ExtLink";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import replace from "lodash/replace";
import useTranslation from "next-translate/useTranslation";

interface Props {
  vuorovaikutusnro: number;
}

export default function VuorovaikuttaminenEpaaktiivinenWrapper({ vuorovaikutusnro }: Props): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();
  return (
    <>{projekti && kirjaamoOsoitteet && <VuorovaikuttaminenEpaaktiivinen vuorovaikutusnro={vuorovaikutusnro} projekti={projekti} />}</>
  );
}

type SuunnitteluvaiheenVuorovaikuttaminenFormProps = {
  projekti: ProjektiLisatiedolla;
  vuorovaikutusnro: number;
};

function VuorovaikuttaminenEpaaktiivinen({ vuorovaikutusnro, projekti }: SuunnitteluvaiheenVuorovaikuttaminenFormProps): ReactElement {
  const vuorovaikutusKierrosjulkaisu = useMemo(
    () =>
      projekti?.vuorovaikutusKierrosJulkaisut?.find((v) => {
        return v.id === vuorovaikutusnro;
      }),
    [projekti, vuorovaikutusnro]
  );

  const aloituskuulutusjulkaisu = useMemo(() => {
    // aloituskuulutusjulkaisusta katsotaan projektin sisällönkuvaus
    return projekti?.aloitusKuulutusJulkaisu;
  }, [projekti]);

  const { t } = useTranslation();

  if (!(aloituskuulutusjulkaisu && vuorovaikutusKierrosjulkaisu)) {
    return <></>;
  }

  const velhoURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + projekti.oid;

  return (
    <>
      <Section className="mb-4">
        <SectionContent>
          <h3 className="vayla-title">Vuorovaikuttaminen</h3>
        </SectionContent>
        <VuorovaikutusPaivamaaraJaTiedotLukutila
          aloituskuulutusjulkaisu={aloituskuulutusjulkaisu}
          vuorovaikutus={vuorovaikutusKierrosjulkaisu}
        />
      </Section>
      <VuorovaikutusMahdollisuudet
        projekti={projekti}
        vuorovaikutusTilaisuudet={vuorovaikutusKierrosjulkaisu.vuorovaikutusTilaisuudet || []}
      />
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
          {vuorovaikutusKierrosjulkaisu.yhteystiedot?.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {replace(yhteystietoVirkamiehelleTekstiksi(yhteystieto, t), "@", "[at]")}
            </p>
          ))}
        </SectionContent>
        <SectionContent>
          <p className="vayla-label">Kutsu vuorovaikutamiseen julkisella puolella</p>
          <p>
            Linkki julkiselle puolelle on muodostettu vuorovaikuttamisen julkaisupäivänä. Julkaisupäivä{" "}
            {formatDate(vuorovaikutusKierrosjulkaisu.vuorovaikutusJulkaisuPaiva)}.
          </p>
        </SectionContent>
        <SectionContent>
          <p className="vayla-label">Ladattavat kutsut ja ilmoitukset</p>
          <p>Kuulutukset löytyvät asianhallinnasta.</p>
        </SectionContent>
      </Section>
      <IlmoituksenVastaanottajatLukutila vuorovaikutus={vuorovaikutusKierrosjulkaisu} />
    </>
  );
}
