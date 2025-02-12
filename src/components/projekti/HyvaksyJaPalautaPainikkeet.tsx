import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import KuulutuksenHyvaksyminenDialog from "@components/projekti/KuulutuksenHyvaksyminenDialog";
import KuulutuksenPalauttaminenDialog from "@components/projekti/KuulutuksenPalauttaminenDialog";
import { Stack } from "@mui/system";
import { TilasiirtymaTyyppi } from "@services/api";
import { GenericApiKuulutusJulkaisu } from "backend/src/projekti/projektiUtil";
import { isInPast } from "common/util/dateUtils";
import React, { useCallback, useState } from "react";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useSnackbars from "src/hooks/useSnackbars";
import { paivamaara } from "hassu-common/schema/paivamaaraSchema";
import * as yup from "yup";
import { tilaSiirtymaTyyppiToVaiheMap } from "src/util/tilaSiirtymaTyyppiToVaiheMap";
import { isAsianhallintaVaarassaTilassa } from "src/util/asianhallintaVaarassaTilassa";
import { isKuntatietoMissing } from "../../util/velhoUtils";
import capitalize from "lodash/capitalize";

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
    const puuttuuKuntatieto = isKuntatietoMissing(projekti);
    const kuulutusPaivaInPast = !!julkaisu.kuulutusPaiva && isInPast(julkaisu.kuulutusPaiva);
    const asianhallintaVaaraTila = isAsianhallintaVaarassaTilassa(projekti, tilaSiirtymaTyyppiToVaiheMap[tilasiirtymaTyyppi]);

    const puutteet: string[] = [];

    if (puuttuuKuntatieto) {
      puutteet.push("kuntatiedot puuttuvat");
    }
    if (kuulutusPaivaInPast) {
      puutteet.push("kuulutuspäivämäärä on menneisyydessä");
    }
    if (asianhallintaVaaraTila) {
      puutteet.push("asianhallinta on väärässä tilassa");
    }

    const isValid = await yup
      .object()
      .shape({ kuulutusPaiva: paivamaara({ preventPast: true }) })
      .isValid(julkaisu);

    if (!isValid) {
      puutteet.push("kuulutuspäivämäärä on virheellinen");
    }

    if (puutteet.length > 0) {
      const muut = puutteet.slice(0, -1);
      const viimeinen = puutteet[puutteet.length - 1];
      const formattedPuutteet = muut.length ? capitalize(muut.join(", ") + " ja " + viimeinen) : capitalize(viimeinen);

      showErrorMessage(formattedPuutteet);
      return;
    }

    setIsOpenHyvaksy(true);
  }, [julkaisu, showErrorMessage, projekti, tilasiirtymaTyyppi]);

  return (
    <>
      <Section noDivider>
        <Stack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]}>
          <Button type="button" id="button_reject" onClick={openPalauta}>
            Palauta
          </Button>
          <Button type="button" id="button_open_acceptance_dialog" primary onClick={openHyvaksy}>
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
