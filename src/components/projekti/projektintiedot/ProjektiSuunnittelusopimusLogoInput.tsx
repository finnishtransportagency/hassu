import React, { ReactElement, useMemo } from "react";
import { ControllerProps, FieldValues } from "react-hook-form";
import { KaannettavaKieli } from "common/kaannettavatKielet";
import { ControlledLogoInput } from "../ControlledLogoInput";

interface Props<TFieldValues extends FieldValues> {
  lang: KaannettavaKieli;
  isPrimaryLang: boolean;
  name: ControllerProps<TFieldValues>["name"];
  disabled?: boolean;
}
export default function ProjektiSuunnittelusopimusLogoInput<TFieldValues extends FieldValues>({
  isPrimaryLang,
  lang,
  disabled,
  name,
}: Props<TFieldValues>): ReactElement {
  const langLabel = useMemo(
    () => (
      <>
        Virallinen, kunnalta saatu logo suunnitelman {isPrimaryLang ? "ensisijaisella" : "toissijaisella"} kielellä (
        <b>{lang.toLowerCase()}</b>). *
      </>
    ),
    [isPrimaryLang, lang]
  );

  return <ControlledLogoInput label={langLabel} name={name} disabled={disabled} />;
}
