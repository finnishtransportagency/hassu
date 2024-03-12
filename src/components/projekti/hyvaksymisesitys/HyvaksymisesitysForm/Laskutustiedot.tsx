import { useFormContext } from "react-hook-form";
import { HyvaksymisesitysFormValues } from "../types";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import TextInput from "@components/form/TextInput";

export default function Laskutustiedot({ index }: Readonly<{ index: number }>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<HyvaksymisesitysFormValues>();

  return (
    <SectionContent className="mb-8">
      <h3 className="vayla-subtitle mb-1">Päätöksen hyväksymisen laskutustiedot</h3>
      <HassuGrid cols={{ lg: 2 }}>
        <TextInput
          label="Y-tunnus"
          {...register(`hyvaksymisesitykset.${index}.laskutustiedot.yTunnus`)}
          error={(errors as any).hyvaksymisesitykset?.[index].laskutustiedot.yTunnus}
        />
        <TextInput
          label="OVT-tunnus"
          {...register(`hyvaksymisesitykset.${index}.laskutustiedot.ovtTunnus`)}
          error={(errors as any).hyvaksymisesitykset?.[index].laskutustiedot.ovtTunnus}
        />
        <TextInput
          label="Verkkolaskuoperaattorin välittäjätunnus"
          {...register(`hyvaksymisesitykset.${index}.laskutustiedot.verkkolaskuoperaattorinTunnus`)}
          error={(errors as any).hyvaksymisesitykset?.[index].laskutustiedot.verkkolaskuoperaattorinTunnus}
        />
        <TextInput
          label="Viitetieto"
          {...register(`hyvaksymisesitykset.${index}.laskutustiedot.viitetieto`)}
          error={(errors as any).hyvaksymisesitykset?.[index].laskutustiedot.viitetieto}
        />
      </HassuGrid>
    </SectionContent>
  );
}
