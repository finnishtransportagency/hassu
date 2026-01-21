import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import { HyvaksymisPaatosVaihe } from "@services/api";
import { formatDateTime } from "common/util/dateUtils";
import { Stack } from "@mui/system";

type Props = {
  vaihe: HyvaksymisPaatosVaihe;
};

export default function LukutilainenAlkuperainenPaatosTiedostot({ vaihe }: Props) {
  if (vaihe.alkuperainenPaatos?.length) {
    return (
      <Stack direction="column" rowGap={2}>
        {vaihe.alkuperainenPaatos.map((aineisto) => (
          <span key={aineisto.dokumenttiOid}>
            <HassuAineistoNimiExtLink
              tiedostoPolku={aineisto.tiedosto}
              aineistoNimi={aineisto.nimi}
              aineistoTila={aineisto.tila}
              sx={{ mr: 3 }}
              target="_blank"
            />
            {aineisto.tuotu && formatDateTime(aineisto.tuotu)}
          </span>
        ))}
      </Stack>
    );
  } else {
    return <></>;
  }
}
