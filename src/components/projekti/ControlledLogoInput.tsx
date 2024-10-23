import IconButton from "@components/button/IconButton";
import FileInput from "@components/form/FileInput";
import FormGroup from "@components/form/FormGroup";
import HassuStack from "@components/layout/HassuStack";
import { FileSizeExceededLimitError, FileTypeNotAllowedError } from "common/error";
import { ReactElement, useCallback, useEffect, useState } from "react";
import {
  Controller,
  ControllerProps,
  ControllerRenderProps,
  FieldValues,
  Path,
  PathValue,
  UnpackNestedValue,
  useFormContext,
} from "react-hook-form";
import useSnackbars from "src/hooks/useSnackbars";
import { validateTiedostoForUpload } from "src/util/fileUtil";

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

  const { showErrorMessage } = useSnackbars();

  const logoUrlWatch = watch(name) as string | File | null | undefined;

  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (logoUrlWatch instanceof File) {
      setLogoUrl(URL.createObjectURL(logoUrlWatch));
    } else if (typeof logoUrlWatch === "string" || logoUrlWatch === null) {
      setLogoUrl(logoUrlWatch || undefined);
    }
  }, [logoUrlWatch]);

  const updateLogoIfValid = useCallback(
    (logoTiedosto: File | undefined, field: ControllerRenderProps<TFieldValues, Path<TFieldValues>>) => {
      if (!logoTiedosto) {
        return;
      }
      try {
        validateTiedostoForUpload(logoTiedosto);
        field.onChange(logoTiedosto);
      } catch (e) {
        if (e instanceof FileSizeExceededLimitError) {
          const filename = e.file?.name;
          const file = filename ? "Tiedosto '" + filename + "'" : "Tiedosto";
          showErrorMessage(`${file} ylittää 25 Mt maksimikoon.`);
        } else if (e instanceof FileTypeNotAllowedError) {
          const filename = e.file?.name;
          const file = filename ? "Tiedosto '" + filename + "'" : "Tiedosto";
          showErrorMessage(`${file} on väärää tiedostotyyppiä. Sallitut tyypit: pdf, jpg, png, doc, docx ja txt.`);
        } else {
          // Ei pitäisi tapahtua
          console.log("Tiedoston validointi epäonnistui", e);
          showErrorMessage("Tiedoston validointi epäonnistui.");
        }
      }
    },
    [showErrorMessage]
  );

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
              onDrop={(files) => updateLogoIfValid(files[0], field)}
              bottomInfoText="Tuetut tiedostomuodot ovat JPEG ja PNG. Sallittu tiedostokoko on maksimissaan 25 Mt."
              disabled={disabled}
              onChange={(e) => updateLogoIfValid(e.target.files?.[0], field)}
            />
          </span>
        )
      }
      name={name}
      control={control}
      defaultValue={null as UnpackNestedValue<PathValue<TFieldValues, Path<TFieldValues>>>}
      shouldUnregister
    />
  );
}
