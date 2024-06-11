import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import KuulutuksenHyvaksyminenDialog from "@components/projekti/KuulutuksenHyvaksyminenDialog";
import KuulutuksenPalauttaminenDialog from "@components/projekti/KuulutuksenPalauttaminenDialog";
import { Stack } from "@mui/system";
import { TilasiirtymaTyyppi } from "@services/api";
import { GenericApiKuulutusJulkaisu } from "backend/src/projekti/projektiUtil";
import { isInPast } from "common/util/dateUtils";
import React, { useCallback, useMemo, useState } from "react";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useSnackbars from "src/hooks/useSnackbars";
import { paivamaara } from "hassu-common/schema/paivamaaraSchema";
import * as yup from "yup";
import { tilaSiirtymaTyyppiToVaiheMap } from "src/util/tilaSiirtymaTyyppiToVaiheMap";
import { isAsianhallintaVaarassaTilassa } from "src/util/asianhallintaVaarassaTilassa";

type Props = {
  projekti: ProjektiLisatiedolla;
  julkaisu: GenericApiKuulutusJulkaisu;
  tilasiirtymaTyyppi: Exclude<TilasiirtymaTyyppi, TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS>;
};

export default function HyvaksyJaPalautaPainikkeet({ projekti, julkaisu, tilasiirtymaTyyppi }: Props) {
  const [isOpenPalauta, setIsOpenPalauta] = useState(false);
  const [isOpenHyvaksy, setIsOpenHyvaksy] = useState(false);
  const { showErrorMessage } = useSnackbars();

  const closePalauta = useCallback(() => {
    setIsOpenPalauta(false);
  }, []);

  const openPalauta = useCallback(() => {
    setIsOpenPalauta(true);
  }, []);

  const closeHyvaksy = useCallback(() => {
    setIsOpenHyvaksy(false);
  }, []);

  const openHyvaksy = useCallback(async () => {
    const isValid = await yup
      .object()
      .shape({ kuulutusPaiva: paivamaara({ preventPast: true }) })
      .isValid(julkaisu);

    if (isValid) {
      setIsOpenHyvaksy(true);
    } else {
      showErrorMessage("Kuulutuspäivämärä on menneisyydessä tai virheellinen. Palauta kuulutus muokattavaksi ja korjaa päivämäärä.");
    }
  }, [julkaisu, showErrorMessage]);

  const hyvaksyIsDisabled = useMemo(() => {
    const kuulutusPaivaInPast = !!julkaisu.kuulutusPaiva && isInPast(julkaisu.kuulutusPaiva);
    return kuulutusPaivaInPast || isAsianhallintaVaarassaTilassa(projekti, tilaSiirtymaTyyppiToVaiheMap[tilasiirtymaTyyppi]);
  }, [julkaisu.kuulutusPaiva, projekti, tilasiirtymaTyyppi]);

  return (
    <>
      <Section noDivider>
        <Stack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]}>
          <Button type="button" id="button_reject" onClick={openPalauta}>
            Palauta
          </Button>
          <Button type="button" id="button_open_acceptance_dialog" disabled={hyvaksyIsDisabled} primary onClick={openHyvaksy}>
            {!!julkaisu.aineistoMuokkaus ? "Hyväksy" : "Hyväksy ja lähetä"}
          </Button>
        </Stack>
      </Section>
      <KuulutuksenPalauttaminenDialog
        open={isOpenPalauta}
        projekti={projekti}
        onClose={closePalauta}
        isAineistoMuokkaus={!!julkaisu.aineistoMuokkaus}
        tilasiirtymaTyyppi={tilasiirtymaTyyppi}
      />
      <KuulutuksenHyvaksyminenDialog
        open={isOpenHyvaksy}
        projekti={projekti}
        onClose={closeHyvaksy}
        isAineistoMuokkaus={!!julkaisu.aineistoMuokkaus}
        julkaisu={julkaisu}
        tilasiirtymaTyyppi={tilasiirtymaTyyppi}
      />
    </>
  );
}
