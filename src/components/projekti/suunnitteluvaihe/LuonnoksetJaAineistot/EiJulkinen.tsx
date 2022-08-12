import SectionContent from "@components/layout/SectionContent";
import Notification, { NotificationType } from "@components/notification/Notification";
import { Vuorovaikutus } from "@services/api";
import MuokkaustilainenLomake from "./MuokkaustilainenLomake";

interface Props {
  vuorovaikutus: Vuorovaikutus | undefined;
  updateFormContext: () => void;
}

export default function EiJulkinenLuonnoksetJaAineistotLomake({ vuorovaikutus, updateFormContext }: Props) {
  return (
    <>
      <SectionContent>
        <h4 className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h4>
        <p>
          Esittelyvideo tulee olla ladattuna erilliseen videojulkaisupalveluun (esim. Youtube) ja videon katselulinkki
          tuodaan sille tarkoitettuun kenttään. Luonnokset ja muut materiaalit tuodaan Projektivelhosta.
          Suunnitelmaluonnokset ja esittelyaineistot on mahdollista. Suunnitelmaluonnokset ja aineistot julkaistaan
          palvelun julkisella puolella vuorovaikutuksen julkaisupäivänä.
        </p>
        <Notification type={NotificationType.INFO_GRAY}>
          Huomioithan, että suunnitelmaluonnoksien ja esittelyaineistojen tulee täyttää saavutettavuusvaatimukset.
        </Notification>
      </SectionContent>
      <MuokkaustilainenLomake vuorovaikutus={vuorovaikutus} hidden={false} updateFormContext={updateFormContext} />
    </>
  );
}
