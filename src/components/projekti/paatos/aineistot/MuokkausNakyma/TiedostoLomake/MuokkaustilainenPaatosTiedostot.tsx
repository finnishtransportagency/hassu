import Button from "@components/button/Button";
import HyvaksymisPaatosTiedostot from "./HyvaksymisPaatosTiedostotTaulu";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";
import { getPaatosInfoText } from "../textsForDifferentPaatos";
import { HyvaksymisPaatosVaiheAineistotFormValues } from "..";
import { adaptVelhoAineistoToAineistoInput, combineOldAndNewAineisto } from "@components/projekti/common/Aineistot/util";
import ContentSpacer from "@components/layout/ContentSpacer";
import Notification, { NotificationType } from "@components/notification/Notification";

type Props = {
  paatosTyyppi: PaatosTyyppi;
};

const maxPaatosFileSize = 30 * 1024 * 1024;

export default function MuokkaustilainenPaatosTiedostot({ paatosTyyppi }: Props) {
  const { watch, setValue } = useFormContext<HyvaksymisPaatosVaiheAineistotFormValues>();
  const hyvaksymisPaatos = watch("hyvaksymisPaatos");

  const totalPaatosSize = hyvaksymisPaatos?.reduce((combinedSize, { koko }) => (combinedSize += koko ?? 0), 0) ?? 0;

  const [paatosDialogOpen, setPaatosDialogOpen] = useState(false);

  return (
    <ContentSpacer gap={7}>
      <p>{getPaatosInfoText(paatosTyyppi)}</p>
      {totalPaatosSize > maxPaatosFileSize && (
        <Notification type={NotificationType.WARN}>
          Päätöstiedostot ovat yhdistetyltä kooltaan yli 30 Mt, minkä takia niitä ei voi lähetettää vastaanottajille sähköpostin liitteinä.
          Valitse pienemmät tiedostot tai välitä tiedostot tiedotetaville järjestelmän ulkopuolella.
        </Notification>
      )}
      {!!hyvaksymisPaatos?.length && <HyvaksymisPaatosTiedostot />}
      <AineistojenValitseminenDialog
        open={paatosDialogOpen}
        infoText="Valitse yksi tai useampi päätöstiedosto."
        onClose={() => setPaatosDialogOpen(false)}
        onSubmit={(velhoAineistot) => {
          const newAineisto = velhoAineistot.map(adaptVelhoAineistoToAineistoInput);
          const newHyvaksymisPaatos = combineOldAndNewAineisto({
            oldAineisto: hyvaksymisPaatos,
            newAineisto,
          });
          setValue("hyvaksymisPaatos", newHyvaksymisPaatos);
        }}
      />
      <Button type="button" onClick={() => setPaatosDialogOpen(true)} id="tuo_paatos_button">
        Tuo päätös
      </Button>
    </ContentSpacer>
  );
}
