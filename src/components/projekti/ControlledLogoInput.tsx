import IconButton from "@components/button/IconButton";
import FileInput from "@components/form/FileInput";
import FormGroup from "@components/form/FormGroup";
import HassuStack from "@components/layout/HassuStack";
import { ReactElement, useEffect, useState } from "react";
import { Controller, ControllerProps, FieldValues, useFormContext } from "react-hook-form";

type ControlledLogoInputProps<TFieldValues extends FieldValues> = {
  label: JSX.Element;
  name: ControllerProps<TFieldValues>["name"];
  disabled?: boolean;
};

export function ControlledLogoInput<TFieldValues extends FieldValues>({
  disabled,
  label,
  name,
}: ControlledLogoInputProps<TFieldValues>): ReactElement {
  const { control, watch } = useFormContext<TFieldValues>();

  const logoUrlWatch = watch(name) as string | File | null | undefined;

  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (logoUrlWatch instanceof File) {
      setLogoUrl(URL.createObjectURL(logoUrlWatch));
    } else if (typeof logoUrlWatch === "string" || logoUrlWatch === null) {
      setLogoUrl(logoUrlWatch || undefined);
    }
  }, [logoUrlWatch]);

  // @ts-ignore
  return (
    <Controller
      render={({ field, fieldState }) =>
        field.value ? (
          <FormGroup errorMessage={fieldState.error?.message}>
            <p>{label}</p>
            <HassuStack direction="row">
              <img className="h-11 border-gray border mb-3.5 py-2 px-3" src={logoUrl} alt="Suunnittelusopimus logo" />
              <IconButton
                name={`${name}_trash_button`}
                icon="trash"
                type="button"
                disabled={disabled}
                onClick={() => {
                  field.onChange(null);
                }}
              />
            </HassuStack>
          </FormGroup>
        ) : (
          <span>
            <p>{label}</p>
            <FileInput
              maxFiles={1}
              error={fieldState.error}
              onDrop={(files) => {
                const logoTiedosto = files[0];
                if (logoTiedosto) {
                  field.onChange(logoTiedosto);
                }
              }}
              bottomInfoText="Tuetut tiedostomuodot ovat JPEG ja PNG. Sallittu tiedostokoko on maksimissaan 25 Mt."
              disabled={disabled}
              onChange={(e) => {
                const logoTiedosto = e.target.files?.[0];
                if (logoTiedosto) {
                  field.onChange(logoTiedosto);
                }
              }}
            />
          </span>
        )
      }
      name={name}
      control={control}
      defaultValue={undefined}
      shouldUnregister
    />
  );
}
