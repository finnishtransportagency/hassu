import Textarea from "@components/form/Textarea";
import SectionContent from "@components/layout/SectionContent";
import { Box, Checkbox, FormControlLabel } from "@mui/material";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { ReactElement } from "react";
import { useFormContext } from "react-hook-form";

export default function ViestiVastaanottajalle(): ReactElement {
  const { register, watch } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const checked = watch("muokattavaHyvaksymisEsitys.kiireellinen");

  return (
    <SectionContent>
      <h3 className="vayla-subtitle">Viesti vastaanottajalle</h3>

      <Box>
        <FormControlLabel
          label="Pyydetään kiireellistä käsittelyä"
          control={<Checkbox {...register(`muokattavaHyvaksymisEsitys.kiireellinen`)} checked={!!checked} />}
        />
      </Box>

      <h4 className="vayla-small-title">Lisätiedot</h4>
      <p>Lisätieto näkyy...</p>
      <Textarea label="" {...register(`muokattavaHyvaksymisEsitys.lisatiedot`)} maxLength={2000} />
    </SectionContent>
  );
}
