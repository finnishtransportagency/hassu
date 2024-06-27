import React, { ReactElement } from "react";
import { VuorovaikutusKierrosJulkaisu } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import IlmoituksenVastaanottajatCommon from "../../common/IlmoituksenVastaanottajatLukutilaCommon";
import { H3 } from "../../../Headings";
interface Props {
  vuorovaikutus: VuorovaikutusKierrosJulkaisu | undefined;
}

export default function IlmoituksenVastaanottajatLukutila({ vuorovaikutus }: Props): ReactElement {
  return (
    <Section>
      <H3>Kutsun ilmoituksen vastaanottajat</H3>
      <SectionContent>
        <p>
          Ilmoitus vuorovaikuttamisesta on lähetetty eteenpäin alla oleville viranomaisille ja kunnille. Jos ilmoituksen tila on ‘Ei
          lähetetty’, tarkasta sähköpostiosoite. Olethan näissä tapauksissa yhteydessä myös Väyläviraston neuvontaan.
        </p>
      </SectionContent>
      <IlmoituksenVastaanottajatCommon ilmoituksenVastaanottajat={vuorovaikutus?.ilmoituksenVastaanottajat} />
    </Section>
  );
}
