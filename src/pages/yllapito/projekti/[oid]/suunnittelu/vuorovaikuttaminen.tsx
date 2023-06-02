import React, { ReactElement } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import SuunnitteluPageLayout from "@components/projekti/suunnitteluvaihe/PageLayout";
import VuorovaikuttaminenEpaaktiivinenLukutila from "@components/projekti/suunnitteluvaihe/EpaaktiivinenTilaVuorovaikutukselle";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import SuunnitteluvaiheenVuorovaikuttaminen from "@components/projekti/suunnitteluvaihe/VuorovaikutusKierros";
import { VuorovaikutusKierrosTila } from "@services/api";
import VuorovaikutusKierrosLukutila from "@components/projekti/suunnitteluvaihe/LukutilaVuorovaikutukselle";

export default function VuorovaikutusKierrosWrapper() {
  const { data: projekti } = useProjekti();

  if (!projekti) {
    return <></>;
  }

  return <VuorovaikutusKierros projekti={projekti} />;
}

function VuorovaikutusKierros({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement {
  const kierrosId = projekti.vuorovaikutusKierros?.vuorovaikutusNumero || 0;

  const migroitu = projekti?.vuorovaikutusKierros?.tila == VuorovaikutusKierrosTila.MIGROITU;

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  const lukutila: boolean =
    !!projekti.vuorovaikutusKierrosJulkaisut?.find((julkaisu) => julkaisu.id === projekti?.vuorovaikutusKierros?.vuorovaikutusNumero) ||
    !projekti.nykyinenKayttaja.omaaMuokkausOikeuden;

  if (epaaktiivinen) {
    return (
      <SuunnitteluPageLayout lukutila={true}>
        <VuorovaikuttaminenEpaaktiivinenLukutila vuorovaikutusnro={kierrosId} />
      </SuunnitteluPageLayout>
    );
  }

  if (lukutila) {
    return (
      <SuunnitteluPageLayout lukutila={true}>
        <VuorovaikutusKierrosLukutila vuorovaikutusnro={kierrosId} projekti={projekti} />
      </SuunnitteluPageLayout>
    );
  }

  if (migroitu) {
    return (
      <SuunnitteluPageLayout lukutila={!!projekti.nahtavillaoloVaiheJulkaisu}>
        <p>
          Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten
          kuulutuksen tietoja ei ole saatavilla palvelusta.
        </p>
      </SuunnitteluPageLayout>
    );
  }

  return (
    <SuunnitteluPageLayout>
      <SuunnitteluvaiheenVuorovaikuttaminen vuorovaikutusnro={kierrosId} />
    </SuunnitteluPageLayout>
  );
}
