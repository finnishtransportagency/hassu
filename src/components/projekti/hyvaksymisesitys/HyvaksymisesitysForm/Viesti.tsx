import { useFormContext } from "react-hook-form";
import { HyvaksymisesitysFormValues } from "../types";
import SectionContent from "@components/layout/SectionContent";
import Textarea from "@components/form/Textarea";

export default function Viesti({ index }: Readonly<{ index: number }>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<HyvaksymisesitysFormValues>();

  return (
    <SectionContent className="mb-8">
      <h3 className="vayla-subtitle mb-1">Viesti vastaanottajalle</h3>
      <Textarea
        label="Viesti vastaanottajalle"
        {...register(`hyvaksymisesitykset.${index}.viesti`)}
        error={(errors as any).hyvaksymisesitykset?.[index]?.viesti}
        maxLength={2000}
      />
    </SectionContent>
  );
}
