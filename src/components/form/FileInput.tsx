import Button from "@components/button/Button";
import React from "react";
import { FieldError } from "react-hook-form";
import FormGroup from "./FormGroup";
import { DropzoneOptions, useDropzone } from "react-dropzone";
import classNames from "classnames";

type DropzoneProps = {
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  label?: string;
  error?: FieldError;
  bottomInfoText?: string;
  hideErrorMessage?: boolean;
  noDropzone?: boolean;
  buttonText?: string;
} & DropzoneOptions;

export const FileInput = ({
  onChange,
  label,
  error,
  bottomInfoText,
  hideErrorMessage,
  multiple = false,
  noClick = true,
  maxSize = 25000000,
  buttonText = "Valitse tiedosto",
  accept = "image/jpeg, image/png",
  noDropzone = false,
  ...otherDropzoneOptions
}: DropzoneProps) => {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple,
    noClick,
    maxSize,
    accept,
    ...otherDropzoneOptions,
  });

  return (
    <FormGroup label={label} errorMessage={hideErrorMessage ? undefined : error?.message}>
      {!noDropzone ? (
        <>
          <div
            {...getRootProps()}
            className={classNames(
              "border-dashed border border-gray py-4 flex flex-col justify-center items-center relative",
              isDragActive &&
                "before:inset-0 before:absolute before:bg-gray-light before:bg-opacity-50 before:z-50 before:pointer-events-none"
            )}
          >
            <p className="mb-4 flex flex-wrap justify-center text-center">
              Pudota tiedosto tähän <br />
              tai
            </p>
            <input name="fileInput" {...getInputProps({ onChange })} />
            <Button type="button" onClick={open}>
              {buttonText}
            </Button>
            <p className="mt-4 mb-0 text-center">{bottomInfoText}</p>
          </div>
        </>
      ) : (
        <>
          <input name="fileInput" {...getInputProps({ onChange })} />
          <Button type="button" onClick={open}>
            {buttonText}
          </Button>
        </>
      )}
    </FormGroup>
  );
};

export default FileInput;
