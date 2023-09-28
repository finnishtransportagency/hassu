import React, { ReactElement, useMemo } from "react";
import { ControllerProps, FieldValues } from "react-hook-form";
import { KaannettavaKieli } from "common/kaannettavatKielet";
import { ControlledLogoInput } from "./ControlledLogoInput";

interface Props<TFieldValues extends FieldValues> {
  lang: KaannettavaKieli;
  isPrimaryLang: boolean;
  name: ControllerProps<TFieldValues>["name"];
  disabled?: boolean;
}

export default function ProjektiEuRahoitusLogoInput<TFieldValues extends FieldValues>({
  isPrimaryLang,
  lang,
  disabled,
  name,
}: Props<TFieldValues>): ReactElement {
  const label = useMemo(
    () => (
      <>
        Virallinen EU-rahoituksen logo suunnitelman {isPrimaryLang ? "ensisijaisella" : "toissijaisella"} kielellä (
        <b>{lang.toLowerCase()}</b>). *
      </>
    ),
    [isPrimaryLang, lang]
  );

  return <ControlledLogoInput label={label} name={name} disabled={disabled} />;
}
