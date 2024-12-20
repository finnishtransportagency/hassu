import React, { ReactElement } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import SuunnitteluPageLayoutWrapper from "@components/projekti/suunnitteluvaihe/PageLayout";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import SuunnitteluvaiheenPerustiedotLukutila from "@components/projekti/lukutila/SuunnitteluvaiheenPerustiedotLukutila";
import SuunnitteluvaiheenPerustiedot from "@components/projekti/suunnitteluvaihe/Perustiedot";
import { VuorovaikutusKierrosTila } from "@services/api";

export default function SuunnitteluWrapper() {
  const { data: projekti } = useProjekti();

  if (!projekti) {
    return <></>;
  }

  return <Suunnittelu projekti={projekti} />;
}

function Suunnittelu({ projekti }: Readonly<{ projekti: ProjektiLisatiedolla }>): ReactElement {
  const migroitu = projekti?.vuorovaikutusKierros?.tila == VuorovaikutusKierrosTila.MIGROITU;
  const viimeisinJulkaisuOnKopio =
    projekti.vuorovaikutusKierrosJulkaisut?.[projekti.vuorovaikutusKierrosJulkaisut?.length - 1].julkaisuOnKopio &&
    projekti.vuorovaikutusKierros?.tila &&
    projekti.vuorovaikutusKierros?.tila !== VuorovaikutusKierrosTila.MUOKATTAVISSA;
  const lukutila =
    projektiOnEpaaktiivinen(projekti) || !projekti.nykyinenKayttaja.omaaMuokkausOikeuden || !!projekti.nahtavillaoloVaiheJulkaisu;

  if (migroitu) {
    return (
      <SuunnitteluPageLayoutWrapper showLuoUusiKutsuButton={!projekti.nahtavillaoloVaiheJulkaisu}>
        <p>
          Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten
          kuulutuksen tietoja ei ole saatavilla palvelusta.
        </p>
      </SuunnitteluPageLayoutWrapper>
    );
  }

  if (lukutila || viimeisinJulkaisuOnKopio) {
    return (
      <SuunnitteluPageLayoutWrapper showLuoUusiKutsuButton={!lukutila}>
        <SuunnitteluvaiheenPerustiedotLukutila />
      </SuunnitteluPageLayoutWrapper>
    );
  }

  return (
    <SuunnitteluPageLayoutWrapper showLuoUusiKutsuButton={!projekti.nahtavillaoloVaiheJulkaisu}>
      <SuunnitteluvaiheenPerustiedot />
    </SuunnitteluPageLayoutWrapper>
  );
}
