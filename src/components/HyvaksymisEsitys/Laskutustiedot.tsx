import TextInput from "@components/form/TextInput";
import SectionContent from "@components/layout/SectionContent";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { ReactElement } from "react";
import { useFormContext } from "react-hook-form";

export default function Laskutustiedot(): ReactElement {
  const { register } = useFormContext<TallennaHyvaksymisEsitysInput>();

  return (
    <SectionContent>
      <h3 className="vayla-subtitle">Laskutustiedot hyväksymismaksua varten</h3>
      <TextInput label={"OVT tunnus"} {...register("muokattavaHyvaksymisEsitys.laskutustiedot.ovtTunnus")} />
      <TextInput
        label={"Verkkolaskuoperaattorin välittäjätunnus"}
        {...register("muokattavaHyvaksymisEsitys.laskutustiedot.verkkolaskuoperaattorinTunnus")}
      />
      <TextInput label={"Viitetieto"} {...register("muokattavaHyvaksymisEsitys.laskutustiedot.viitetieto")} />
    </SectionContent>
  );
}
