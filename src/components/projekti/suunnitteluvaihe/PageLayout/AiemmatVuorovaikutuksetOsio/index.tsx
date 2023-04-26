import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import ContentSpacer from "@components/layout/ContentSpacer";
import StyledLink from "@components/StyledLink";
import { DialogActions, DialogContent } from "@mui/material";
import { Kielitiedot, VuorovaikutusKierrosJulkaisu } from "@services/api";
import React, { useCallback, useMemo, useState, VFC } from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import IlmoituksenVastaanottajatLukutila from "../../komponentit/IlmoituksenVastaanottajatLukutila";
import VuorovaikutusPaivamaaraJaTiedotLukutila from "../../komponentit/VuorovaikutusPaivamaaraJaTiedotLukutila";
import LukutilaLinkkiJaKutsut from "../../LukutilaVuorovaikutukselle/LukutilaLinkkiJaKutsut";
import VuorovaikutusMahdollisuudet from "../../LukutilaVuorovaikutukselle/VuorovaikutusMahdollisuudet";
import { AineistotSection } from "./AineistotSection";
import { VuorovaikuttamisenYhteysHenkilot } from "../../LukutilaVuorovaikutukselle/VuorovaikuttamisenYhteysHenkilot";

type Props = {
  projekti: ProjektiLisatiedolla;
};

export default function AiemmatVuorovaikutuksetOsio({ projekti }: Props) {
  const pastVuorovaikutusKierrokset: VuorovaikutusKierrosJulkaisu[] = useMemo(() => {
    return (
      projekti.vuorovaikutusKierrosJulkaisut?.filter((julkaisu) => projekti.vuorovaikutusKierros?.vuorovaikutusNumero !== julkaisu.id) || []
    );
  }, [projekti.vuorovaikutusKierros?.vuorovaikutusNumero, projekti.vuorovaikutusKierrosJulkaisut]);

  if (!pastVuorovaikutusKierrokset.length) {
    return <></>;
  }

  return (
    <ContentSpacer gap={2}>
      <p>
        <strong>Tutustu aiempiin vuorovaikutuksiin</strong>
      </p>
      <ContentSpacer as="ul" gap={2}>
        {pastVuorovaikutusKierrokset.map((julkaisu) => (
          <AiempiJulkaisuLinkki key={julkaisu.id} julkaisu={julkaisu} kielitiedot={projekti.kielitiedot} projekti={projekti} />
        ))}
      </ContentSpacer>
    </ContentSpacer>
  );
}

const AiempiJulkaisuLinkki: VFC<{
  julkaisu: VuorovaikutusKierrosJulkaisu;
  kielitiedot: Kielitiedot | null | undefined;
  projekti: ProjektiLisatiedolla;
}> = ({ julkaisu, kielitiedot, projekti }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);
  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return (
    <li>
      <StyledLink as="button" sx={{ fontWeight: 400 }} onClick={openDialog}>
        {`${julkaisu.id}. kutsu vuorovaikutukseen`}
      </StyledLink>
      {isDialogOpen && (
        <HassuDialog title={`${julkaisu.id}. Vuorovaikuttaminen`} open={isDialogOpen} onClose={closeDialog} maxWidth="lg">
          <DialogContent>
            <VuorovaikutusPaivamaaraJaTiedotLukutila sx={{ marginTop: 0 }} kielitiedot={kielitiedot} vuorovaikutus={julkaisu} />
            <VuorovaikutusMahdollisuudet showAjansiirtopainikkeet={false} projekti={projekti} vuorovaikutusKierrosJulkaisu={julkaisu} />
            <AineistotSection julkaisu={julkaisu} kielitiedot={kielitiedot} />
            <VuorovaikuttamisenYhteysHenkilot julkaisu={julkaisu} />
            <IlmoituksenVastaanottajatLukutila vuorovaikutus={julkaisu} />
            <LukutilaLinkkiJaKutsut projekti={projekti} vuorovaikutus={julkaisu} />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} primary>
              Sulje
            </Button>
          </DialogActions>
        </HassuDialog>
      )}
    </li>
  );
};
