import { useFormContext } from "react-hook-form";
import { LausuntoPyynnotFormValues } from "../types";
import SectionContent from "@components/layout/SectionContent";
import Textarea from "@components/form/Textarea";

export default function Muistiinpano({ index }: Readonly<{ index: number }>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<LausuntoPyynnotFormValues>();

  return (
    <SectionContent className="mb-8">
      <h3 className="vayla-subtitle mb-1">Muistiinpanot</h3>
      <p>
        Voit kirjoittaa muistiin esimerkiksi muille projektin jäsenille kenelle alla oleva linkki on toimitettu. Muistiinpanojen tiedot
        eivät näy linkin vastaanottajalle.
      </p>
      <Textarea
        label="Muistiinpanot"
        {...register(`lausuntoPyynnot.${index}.muistiinpano`)}
        error={(errors as any).lausuntoPyynnot?.[index]?.muistiinpano}
        maxLength={2000}
      />
    </SectionContent>
  );
}
