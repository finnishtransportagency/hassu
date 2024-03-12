import React, { ReactElement, ReactNode, useCallback, useState } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import ProjektiConsumer from "../ProjektiConsumer";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { KuulutusJulkaisuTila, Vaihe } from "@services/api";
import { OhjelistaNotification } from "../common/OhjelistaNotification";

export default function HyvaksymisesitysPageLayoutWrapper({ children }: { children?: ReactNode }) {
  return (
    <ProjektiConsumer>
      {(projekti) => <HyvaksymisesitysPageLayout projekti={projekti}>{children}</HyvaksymisesitysPageLayout>}
    </ProjektiConsumer>
  );
}

function HyvaksymisesitysPageLayout({ projekti, children }: { projekti: ProjektiLisatiedolla; children?: ReactNode }): ReactElement {

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);
  const nahtavillaolovaiheJulkaisu = projekti.nahtavillaoloVaiheJulkaisu;
  const migroitu = nahtavillaolovaiheJulkaisu?.tila == KuulutusJulkaisuTila.MIGROITU;
  const [ohjeetOpen, ohjeetSetOpen] = useState(() => {
    const savedValue = localStorage.getItem("hyvaksymisesitysOhjeet");
    const isOpen = savedValue ? savedValue.toLowerCase() !== "false" : true;
    return isOpen;
  });
  const ohjeetOnClose = useCallback(() => {
    ohjeetSetOpen(false);
    localStorage.setItem("hyvaksymisesitysOhjeet", "false");
  }, []);
  const ohjeetOnOpen = useCallback(() => {
    ohjeetSetOpen(true);
    localStorage.setItem("hyvaksymisesitysOhjeet", "true");
  }, []);

  return (
    <ProjektiPageLayout
      vaihe={Vaihe.NAHTAVILLAOLO}
      title="Hyväksymisesitys"
      showInfo={!ohjeetOpen}
      onOpenInfo={ohjeetOnOpen}
    >
      {!migroitu ? (
        <>
          <Section noDivider>
            {!epaaktiivinen && (
              <>
                <OhjelistaNotification onClose={ohjeetOnClose} open={ohjeetOpen}>
                  <li>
                    Tällä sivulla luodaan hyväksymisesityksenä lähetettävän suunnitelman aineiston sisältö ja määritellään sen
                    vastaanottajat.
                  </li>
                  <li>
                    Anna hyväksymisesitykseen toimitettavalle suunnitelmalle voimassaoloaika. Voimassaoloaika tarkoittaa sitä, että
                    vastaanottajan on mahdollista tarkastella toimitettavan linkin sisältöä kyseiseen päivämäärään saakka. Linkin
                    voimassaoloaikaa on mahdollista muuttaa jälkikäteen.{" "}
                  </li>
                  <li>
                    Tuo suunnitelma Projektivelhosta ja vuorovaikutusaineistot omalta koneelta. Järjestelmä listaa automaattisesti
                    kuulutukset ja kutsun vuorovaikutukseen ennakkoneuvotteluaineistoihin. Voit haluessasi tuoda myös muuta aineistoa.
                  </li>
                  <li>Lisää hyväksymisesitykselle vastaanottajat. </li>
                  <li>Esikatsele hyväksymisesitys ennen lähettämistä.</li>
                </OhjelistaNotification>
              </>
            )}
          </Section>
          {children}
        </>
      ) : (
        <Section noDivider>
          <p>
            Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten
            lausuntopyyntöjen aineistolinkkien tietoja ei ole saatavilla palvelusta.
          </p>
        </Section>
      )}
    </ProjektiPageLayout>
  );
}
