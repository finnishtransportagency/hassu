import { ValidationMode } from "hassu-common/ProjektiValidationContext";
import { useMemo } from "react";
import { FieldValues, useFormContext, UseFormHandleSubmit, UseFormReturn } from "react-hook-form";
import useValidationMode from "./useValidationMode";

type UseHandleSubmitReturn<TFieldValues extends FieldValues> = {
  handleDraftSubmit: UseFormHandleSubmit<TFieldValues>;
  handleSubmit: UseFormHandleSubmit<TFieldValues>;
};

function useHandleSubmit<TFieldValues extends FieldValues = FieldValues, TContext extends object = object>({
  handleSubmit,
}: UseFormReturn<TFieldValues, TContext>): UseHandleSubmitReturn<TFieldValues> {
  const validationMode = useValidationMode();

  return useMemo<UseHandleSubmitReturn<TFieldValues>>(() => {
    const handleDraftSubmit: UseFormHandleSubmit<TFieldValues> = (onValid, onInvalid) => async (e) => {
      if (!validationMode) {
        console.error("validation mode reference missing");
        return;
      }
      validationMode.current = ValidationMode.DRAFT;
      await handleSubmit(onValid, onInvalid)(e);
    };
    const handleNonDraftSubmit: UseFormHandleSubmit<TFieldValues> = (onValid, onInvalid) => async (e) => {
      if (!validationMode) {
        console.error("validation mode reference missing");
        return;
      }
      validationMode.current = ValidationMode.PUBLISH;
      await handleSubmit(onValid, onInvalid)(e);
    };
    return { handleDraftSubmit, handleSubmit: handleNonDraftSubmit };
  }, [handleSubmit, validationMode]);
}

function useHandleSubmitContext<TFieldValues extends FieldValues = FieldValues>(): UseHandleSubmitReturn<TFieldValues> {
  const methods = useFormContext<TFieldValues>();
  return useHandleSubmit(methods);
}

export { useHandleSubmit, useHandleSubmitContext };
