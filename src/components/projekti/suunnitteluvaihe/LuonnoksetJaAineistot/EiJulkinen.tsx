import Section from "@components/layout/Section2";
import { VuorovaikutusKierros } from "@services/api";
import MuokkaustilainenLomake from "./MuokkaustilainenLomake";
import { AineistotSaavutettavuusOhje } from "@components/projekti/common/AineistotSaavutettavuusOhje";

interface Props {
  vuorovaikutus: VuorovaikutusKierros | null | undefined;
}

export default function EiJulkinenLuonnoksetJaAineistotLomake({ vuorovaikutus }: Props) {
  return (
    <Section>
      <h4 className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h4>
      <p>
        Kansalaiselle järjestelmän julkisella puolella esiteltävät suunnitelmaluonnokset ja esittelylyaineistot tuodaan Projektivelhosta.
        Suunnitelmaluonnokset ja aineistot julkaistaan palvelun julkisella puolella kutsun julkaisupäivänä. Suunnitelmaluonnoksia ja
        esittelyaineistoja on mahdollista päivittää myös kutsun julkaisun jälkeen.
      </p>
      <AineistotSaavutettavuusOhje />
      <MuokkaustilainenLomake vuorovaikutus={vuorovaikutus} hidden={false} />
    </Section>
  );
}
