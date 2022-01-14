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
} & DropzoneOptions;

export const FileInput = ({
  onChange,
  label,
  error,
  bottomInfoText,
  hideErrorMessage,
  multiple = false,
  noClick = true,
  maxSize = 4500000,
  accept = "image/jpeg, image/png",
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
      <div
        {...getRootProps()}
        className={classNames(
          "border-dashed border border-gray py-4 flex flex-col justify-center items-center relative",
          isDragActive &&
            "before:inset-0 before:absolute before:bg-gray-light before:bg-opacity-50 before:z-50 before:pointer-events-none"
        )}
      >
        <p className="mb-4 vayla-paragraph flex flex-wrap justify-center">
          <span>Pudota tiedosto tähän tai</span>
        </p>
        <input {...getInputProps({ onChange })} />
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            open();
          }}
        >
          Valitse tiedosto
        </Button>
        <p className="mt-4 mb-0">{bottomInfoText}</p>
      </div>
    </FormGroup>
  );
};

export default FileInput;
