import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import { Stack } from "@mui/system";
import React, { useState } from "react";
import PalautaDialog from "../Dialogs/PalautaDialog";
import HyvaksyDialog from "../Dialogs/HyvaksyDialog";
import { SahkopostiVastaanottaja } from "@services/api";

type Props = {
  versio: number;
  oid: string;
  vastaanottajat: SahkopostiVastaanottaja[];
  invalidPoistumisPaiva: boolean;
  asianhallintaVaarassaTilassa: boolean;
};

export default function HyvaksyTaiPalautaPainikkeet({
  versio,
  oid,
  vastaanottajat,
  invalidPoistumisPaiva,
  asianhallintaVaarassaTilassa,
}: Props) {
  const [isOpenPalauta, setIsOpenPalauta] = useState(false);
  const [isOpenHyvaksy, setIsOpenHyvaksy] = useState(false);

  const disabled = invalidPoistumisPaiva || asianhallintaVaarassaTilassa;

  return (
    <>
      <Section noDivider>
        <Stack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]}>
          <Button type="button" id="button_reject" onClick={() => setIsOpenPalauta(true)}>
            Palauta
          </Button>
          <Button type="button" id="button_open_acceptance_dialog" primary disabled={disabled} onClick={() => setIsOpenHyvaksy(true)}>
            Hyväksy ja lähetä
          </Button>
        </Stack>
      </Section>
      <PalautaDialog open={isOpenPalauta} onClose={() => setIsOpenPalauta(false)} versio={versio} oid={oid} />
      <HyvaksyDialog
        open={isOpenHyvaksy}
        onClose={() => setIsOpenHyvaksy(false)}
        versio={versio}
        oid={oid}
        vastaanottajat={vastaanottajat}
      />
    </>
  );
}
