import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import Notification, { NotificationType } from "@components/notification/Notification";
import { VuorovaikutusKierros } from "@services/api";
import MuokkaustilainenLomake from "./MuokkaustilainenLomake";

interface Props {
  vuorovaikutus: VuorovaikutusKierros | null | undefined;
}

export default function EiJulkinenLuonnoksetJaAineistotLomake({ vuorovaikutus }: Props) {
  return (
    <Section>
      <SectionContent className="mt-8 pb-8">
        <h4 className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h4>
        <p>
          Kansalaiselle järjestelmän julkisella puolella esiteltävät suunnitelmaluonnokset ja esittelylyaineistot tuodaan Projektivelhosta.
          Suunnitelmaluonnokset ja aineistot julkaistaan palvelun julkisella puolella kutsun julkaisupäivänä. Suunnitelmaluonnoksia ja
          esittelyaineistoja on mahdollista päivittää myös kutsun julkaisun jälkeen.
        </p>
        <Notification type={NotificationType.INFO_GRAY}>
          Huomioithan, että suunnitelmaluonnoksien ja esittelyaineistojen tulee täyttää saavutettavuusvaatimukset.
        </Notification>
      </SectionContent>
      <MuokkaustilainenLomake vuorovaikutus={vuorovaikutus} hidden={false} />
    </Section>
  );
}
