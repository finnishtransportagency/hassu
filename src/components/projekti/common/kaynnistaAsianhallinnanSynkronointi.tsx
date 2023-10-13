import React, { ReactElement } from "react";
import ButtonFlatWithIcon from "@components/button/ButtonFlat";
import { ProjektiTestCommand } from "hassu-common/testUtil.dev";
import useAsianhallinnanTila from "../../../hooks/useAsianhallinnanTila";
import { AsiakirjaTyyppi, AsianhallinnanTila, AsianTila } from "hassu-common/graphql/apiModel";

type Props = {
  oid: string;
  asianhallintaSynkronointiTila: AsianTila | null | undefined;
  asiakirjaTyyppi: AsiakirjaTyyppi;
  className?: string;
};

export default function KaynnistaAsianhallinnanSynkronointiNappi({
  oid,
  asianhallintaSynkronointiTila,
  className,
  asiakirjaTyyppi,
}: Props): ReactElement {
  const isIntegraatioAvailable = asianhallintaSynkronointiTila !== "EI_TESTATTAVISSA";
  // Kutsutaan rajapintaa vain jos integraatio on käytössä ja dokumentteja odottaa vientiä. Asettamalla oid=undefined ei apikutsua tehdä.
  const asianhallinnanTila = useAsianhallinnanTila(isIntegraatioAvailable ? oid : undefined, asiakirjaTyyppi).data;
  if (!isIntegraatioAvailable) {
    return (
      <>
        Projekti on luotu ennen asianhallintaintegraation toteutusta, joten asiakirjojen vienti automaattisesti ei ole mahdollista. Vie
        asiakirjat asianhallintaan käsin.
      </>
    );
  }
  return (
    <div className={className}>
      {asianhallintaSynkronointiTila !== AsianTila.SYNKRONOITU && (
        <ButtonFlatWithIcon
          icon="history"
          onClick={(e) => {
            e.preventDefault();
            window.location.assign(ProjektiTestCommand.oid(oid).kaynnistaAsianhallintasynkronointi());
          }}
        >
          Käynnistä asiakirjojen vienti asianhallintaan (TESTAAJILLE)
        </ButtonFlatWithIcon>
      )}
      {naytaIntegroinninTila(asianhallintaSynkronointiTila, asianhallinnanTila)}
    </div>
  );
}

function naytaIntegroinninTila(asianTila: AsianTila | null | undefined, asianhallinnanTila: AsianhallinnanTila | undefined) {
  let tila: string | undefined;
  let asianhallinnanTilaTxt: string | undefined;

  if (asianTila) {
    switch (asianTila) {
      case AsianTila.ASIAA_EI_LOYDY:
        tila = "Asiaa ei löydy";
        break;
      case AsianTila.ASIANHALLINTA_VAARASSA_TILASSA:
        tila = "Asianhallinta on väärässä tilassa";
        break;
      case AsianTila.VIRHE:
        tila = "Synkronoinnissa tapahtui virhe";
        break;
      case AsianTila.SYNKRONOITU:
        tila = "Synkronoitu";
        break;
    }
  }
  if (!tila && asianhallinnanTila) {
    switch (asianhallinnanTila.asianTila) {
      case AsianTila.VALMIS_VIENTIIN:
        asianhallinnanTilaTxt = "Asianhallinta on valmis ottamaan vastaan dokumentteja tästä vaiheesta";
        break;
      case AsianTila.ASIANHALLINTA_VAARASSA_TILASSA:
        asianhallinnanTilaTxt = "Asianhallinta on väärässä tilassa";
        break;
      case AsianTila.ASIAA_EI_LOYDY:
        asianhallinnanTilaTxt = "Asiaa ei löydy";
        break;
    }
  }
  return (
    <>
      {tila && (
        <>
          Dokumenttien viennin tila asianhallintaan: {tila}
          <br />
        </>
      )}
      {asianhallinnanTilaTxt && <>Asian tila asianhallinnassa: {asianhallinnanTilaTxt}</>}
    </>
  );
}
