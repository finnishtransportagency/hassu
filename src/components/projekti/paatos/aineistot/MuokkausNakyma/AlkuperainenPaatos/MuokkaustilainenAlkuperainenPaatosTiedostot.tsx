import Button from "@components/button/Button";
import AlkuperainenPaatosTiedostot from "../AlkuperainenPaatos/AlkuperainenPaatosTiedostotTaulu";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { HyvaksymisPaatosVaiheAineistotFormValues } from "..";
import { adaptVelhoAineistoToAineistoInput, combineOldAndNewAineisto } from "@components/projekti/common/Aineistot/util";
import ContentSpacer from "@components/layout/ContentSpacer";

export default function MuokkaustilainenAlkuperainenPaatosTiedostot() {
  const { watch, setValue } = useFormContext<HyvaksymisPaatosVaiheAineistotFormValues>();
  const alkuperainenPaatos = watch("alkuperainenPaatos");

  const [paatosDialogOpen, setPaatosDialogOpen] = useState(false);

  return (
    <ContentSpacer gap={7}>
      <p>
        Liitä alkuperäinen hyväksymispäätös ja muu liittyvä aineisto. Ne menevät näkyviin kansalaispuolelle, mutta eivät lähde sähköpostilla
        viranomaisille.
      </p>
      {!!alkuperainenPaatos?.length && <AlkuperainenPaatosTiedostot />}
      <AineistojenValitseminenDialog
        open={paatosDialogOpen}
        infoText="Valitse aiempi hyväksymispäätös ja tarvittavat aineistot."
        onClose={() => setPaatosDialogOpen(false)}
        onSubmit={(velhoAineistot) => {
          const newAineisto = velhoAineistot.map(adaptVelhoAineistoToAineistoInput);
          const newAlkuperainenPaatos = combineOldAndNewAineisto({
            oldAineisto: alkuperainenPaatos,
            newAineisto,
          });
          setValue("alkuperainenPaatos", newAlkuperainenPaatos);
        }}
      />
      <Button type="button" onClick={() => setPaatosDialogOpen(true)} id="tuo_alkuperainen_paatos_button">
        Tuo aiempi päätös
      </Button>
    </ContentSpacer>
  );
}
