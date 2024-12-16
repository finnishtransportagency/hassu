import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import ContentSpacer from "@components/layout/ContentSpacer";
import StyledLink from "@components/StyledLink";
import { DialogActions, DialogContent } from "@mui/material";
import { Kielitiedot, VuorovaikutusKierrosJulkaisu, VuorovaikutusKierrosTila } from "@services/api";
import React, { useCallback, useMemo, useState, FunctionComponent } from "react";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import IlmoituksenVastaanottajatLukutila from "../../komponentit/IlmoituksenVastaanottajatLukutila";
import VuorovaikutusPaivamaaraJaTiedotLukutila from "../../komponentit/VuorovaikutusPaivamaaraJaTiedotLukutila";
import LukutilaLinkkiJaKutsut from "../../LukutilaVuorovaikutukselle/LukutilaLinkkiJaKutsut";
import VuorovaikutusMahdollisuudet from "../../LukutilaVuorovaikutukselle/VuorovaikutusMahdollisuudet";
import { AineistotSection } from "./AineistotSection";
import { VuorovaikuttamisenYhteysHenkilot } from "../../LukutilaVuorovaikutukselle/VuorovaikuttamisenYhteysHenkilot";
import { examineJulkaisuPaiva } from "hassu-common/util/dateUtils";
import { Tagi } from "@components/Tagi";

type Props = {
  projekti: ProjektiLisatiedolla;
};

export default function AiemmatVuorovaikutuksetOsio({ projekti }: Props) {
  const pastVuorovaikutusKierrokset: VuorovaikutusKierrosJulkaisu[] = useMemo(() => {
    return projekti.vuorovaikutusKierrosJulkaisut?.slice(0, projekti.vuorovaikutusKierrosJulkaisut.length - 1) || [];
  }, [projekti.vuorovaikutusKierrosJulkaisut]);

  if (!pastVuorovaikutusKierrokset.length) {
    return <></>;
  }

  const viimeisinJulkinenJulkaisu = projekti.vuorovaikutusKierrosJulkaisut?.reduce((max, julkaisu) => {
    const { published } = examineJulkaisuPaiva(julkaisu.tila === VuorovaikutusKierrosTila.JULKINEN, julkaisu.vuorovaikutusJulkaisuPaiva);
    if (published && !julkaisu.julkaisuOnKopio) {
      return Math.max(max, julkaisu.id);
    } else {
      return max;
    }
  }, 0);

  return (
    <ContentSpacer gap={2}>
      <p>
        <strong>Tutustu aiempiin vuorovaikutuksiin</strong>
      </p>
      <ContentSpacer as="ul" gap={2}>
        {pastVuorovaikutusKierrokset.map((julkaisu) => (
          <AiempiJulkaisuLinkki
            key={julkaisu.id}
            julkaisu={julkaisu}
            kielitiedot={projekti.kielitiedot}
            projekti={projekti}
            onViimeisinJulkinenJulkaisu={julkaisu.id == viimeisinJulkinenJulkaisu}
          />
        ))}
      </ContentSpacer>
    </ContentSpacer>
  );
}

const AiempiJulkaisuLinkki: FunctionComponent<{
  julkaisu: VuorovaikutusKierrosJulkaisu;
  kielitiedot: Kielitiedot | null | undefined;
  projekti: ProjektiLisatiedolla;
  onViimeisinJulkinenJulkaisu: boolean;
}> = ({ julkaisu, kielitiedot, projekti, onViimeisinJulkinenJulkaisu }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);
  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const { published, julkaisuPaiva } = examineJulkaisuPaiva(true, julkaisu.vuorovaikutusJulkaisuPaiva);

  return (
    <li>
      <div>
        <StyledLink as="button" sx={{ fontWeight: 400 }} onClick={openDialog}>
          {`${julkaisu.id}. kutsu vuorovaikutukseen`}
        </StyledLink>
        {onViimeisinJulkinenJulkaisu && <Tagi className="ml-4">Esillä julkisella puolella</Tagi>}
        {!published && <Tagi className="ml-4">{`Esillä julkisella puolella ${julkaisuPaiva} lähtien`}</Tagi>}
      </div>
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
