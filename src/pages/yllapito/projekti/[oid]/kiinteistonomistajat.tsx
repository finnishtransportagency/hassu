import { H2, H3 } from "@components/Headings";
import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import ProjektinTiedotPageLayout from "@components/projekti/ProjektiTiedotPageLayout";
import React, { useCallback, useState } from "react";
import { KarttaKiinteistonomistajistaDialog } from "@components/projekti/common/KarttaKiinteistonomistajistaDialog";
import { useProjekti } from "src/hooks/useProjekti";

export default function Kiinteistonomistajat() {
  const { data: _projekti } = useProjekti();
  const [_isDialogOpen, setIsDialogOpen] = useState(false);
  const avaaKarttaDialogi = useCallback(() => {
    setIsDialogOpen(true);
  }, []);
  const suljeKarttaDialogi = useCallback(() => {
    setIsDialogOpen(false);
  }, []);
  return (
    <ProjektinTiedotPageLayout>
      <Section>
        <H2>Kiinteistönomistajien tiedot</H2>
        <p>
          Kuulutukset ja kutsu vuorovaikutukseen voidaan toimittaa kiinteistönomistajille järjestelmän kautta kun kiinteistönomistajat ovat
          tunnistettu kiinteistötunnusten avulla.
        </p>
        <H3>Suunnitelman karttarajaus</H3>
        <p>
          Tuo suunnitelman karttarajaus GeoJson-tiedostona järjestelmään. Tämän piirtää suunnitelman kartalle ja etsii kiinteistönomistajat
          tälle rajaukselle.
        </p>
        <Button primary onClick={avaaKarttaDialogi}>
          Luo karttarajaus
        </Button>
        {typeof window !== "undefined" && (
          <KarttaKiinteistonomistajistaDialog open={true} onClose={suljeKarttaDialogi} geoJSON={undefined} />
        )}
      </Section>
    </ProjektinTiedotPageLayout>
  );
}
