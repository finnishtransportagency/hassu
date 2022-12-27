import SectionContent from "@components/layout/SectionContent";
import Notification, { NotificationType } from "@components/notification/Notification";
import { VuorovaikutusKierros } from "@services/api";
import MuokkaustilainenLomake from "./MuokkaustilainenLomake";

interface Props {
  vuorovaikutus: VuorovaikutusKierros | null | undefined;
}

export default function EiJulkinenLuonnoksetJaAineistotLomake({ vuorovaikutus }: Props) {
  return (
    <>
      <SectionContent className="mt-8">
        <h4 className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h4>
        <p>
          Esittelyvideo tulee olla ladattuna erilliseen videojulkaisupalveluun (esim. Youtube) ja videon katselulinkki tuodaan sille
          tarkoitettuun kenttään. Luonnokset ja muut materiaalit tuodaan Projektivelhosta. Suunnitelmaluonnokset ja esittelyaineistot on
          mahdollista. Suunnitelmaluonnokset ja aineistot julkaistaan palvelun julkisella puolella vuorovaikutuksen julkaisupäivänä.
        </p>
        <Notification type={NotificationType.INFO_GRAY}>
          Huomioithan, että suunnitelmaluonnoksien ja esittelyaineistojen tulee täyttää saavutettavuusvaatimukset.
        </Notification>
      </SectionContent>
      <MuokkaustilainenLomake vuorovaikutus={vuorovaikutus} hidden={false} />
    </>
  );
}
