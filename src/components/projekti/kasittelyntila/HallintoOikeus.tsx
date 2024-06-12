import React from "react";
import SectionContent from "@components/layout/SectionContent";
import { HassuDatePicker } from "@components/form/HassuDatePicker";
import Textarea from "@components/form/Textarea";
import dayjs, { Dayjs } from "dayjs";
import RadioButton from "@components/form/RadioButton";
import { ControllerFieldState, ControllerRenderProps, FormState, useController, useFormContext } from "react-hook-form";
import FormGroup from "@components/form/FormGroup";
import styled from "@emotion/styled";
import { KasittelynTilaFormValues } from "@pages/yllapito/projekti/[oid]/kasittelyntila";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";

type HallintoOikeusProps = { disabled: boolean; projekti: ProjektiLisatiedolla; includeInForm: boolean };

export default function HallintoOikeus({ disabled, projekti, includeInForm }: HallintoOikeusProps) {
  return includeInForm ? (
    <HallintoOikeusControlled disabled={disabled} />
  ) : (
    <HallintoOikeusContent disabled value={projekti.kasittelynTila?.hallintoOikeus} />
  );
}

function HallintoOikeusControlled({ disabled }: { disabled: boolean }) {
  const { formState, control } = useFormContext<KasittelynTilaFormValues>();
  const {
    field: { onChange, value },
    fieldState,
  } = useController({ name: "kasittelynTila.hallintoOikeus", control });
  return <HallintoOikeusContent disabled={disabled} formState={formState} value={value} onChange={onChange} fieldState={fieldState} />;
}

function HallintoOikeusContent(props: {
  disabled?: boolean;
  formState?: FormState<KasittelynTilaFormValues>;
  value: ControllerRenderProps<KasittelynTilaFormValues, "kasittelynTila.hallintoOikeus">["value"];
  onChange?: ControllerRenderProps<KasittelynTilaFormValues, "kasittelynTila.hallintoOikeus">["onChange"];
  fieldState?: ControllerFieldState;
}) {
  const { disabled, fieldState, onChange, value, formState } = props;

  return (
    <SectionContent>
      <h2 className="vayla-title">Hallinto-oikeus</h2>
      <h3 className="vayla-small-title mt-6 !mb-6">Hallinto-oikeuden välipäätös</h3>
      {fieldState?.error?.message && <p className="text-red mb-6">{fieldState.error?.message}</p>}
      <HassuDatePicker
        textFieldProps={{ name: "kasittelynTila.hallintoOikeus.valipaatos.paiva" }}
        label="Päivämäärä"
        disabled={disabled}
        onChange={(date: Dayjs | null, keyboardInputValue?: string | undefined) => {
          const dateStr: null | string = date === null ? null : dayjs(date).format("YYYY-MM-DD");
          onChange?.({
            ...value,
            valipaatos: {
              paiva: dateStr ?? keyboardInputValue ?? null,
              sisalto: value?.valipaatos?.sisalto,
            },
          });
        }}
        value={value?.valipaatos?.paiva === null || value?.valipaatos?.paiva === undefined ? null : dayjs(value?.valipaatos?.paiva)}
      />
      <div style={{ width: "80%" }}>
        <Textarea
          label="Hallinto-oikeuden välipäätöksen sisältö"
          name="kasittelynTila.hallintoOikeus.valipaatos.sisalto"
          disabled={disabled}
          value={value?.valipaatos?.sisalto ?? ""}
          onChange={(e) => {
            onChange?.({
              ...value,
              valipaatos: {
                paiva: value?.valipaatos?.paiva,
                sisalto: e.target.value,
              },
            });
          }}
          error={(formState?.errors as any)?.kasittelynTila?.hallintoOikeus?.valipaatos?.sisalto}
          maxLength={2000}
          minRows={3}
        ></Textarea>
      </div>
      <h3 className="vayla-small-title !mb-6">Hallinto-oikeuden päätös</h3>
      <HassuDatePicker
        textFieldProps={{ name: "kasittelynTila.hallintoOikeus.paatos.paiva" }}
        label="Päivämäärä"
        disabled={disabled}
        onChange={(date: Dayjs | null, keyboardInputValue?: string | undefined) => {
          const dateStr: null | string = date === null ? null : dayjs(date).format("YYYY-MM-DD");
          onChange?.({
            ...value,
            paatos: {
              paiva: dateStr ?? keyboardInputValue ?? null,
              sisalto: value?.paatos?.sisalto,
            },
          });
        }}
        value={value?.paatos?.paiva === null || value?.paatos?.paiva === undefined ? null : dayjs(value?.paatos?.paiva)}
      />
      <div style={{ width: "80%" }}>
        <Textarea
          label={"Hallinto-oikeuden päätöksen sisältö"}
          name="kasittelynTila.hallintoOikeus.paatos.sisalto"
          disabled={disabled}
          value={value?.paatos?.sisalto ?? ""}
          onChange={(e) => {
            onChange?.({
              ...value,
              paatos: {
                paiva: value?.paatos?.paiva,
                sisalto: e.target.value,
              },
            });
          }}
          error={(formState?.errors as any)?.kasittelynTila?.hallintoOikeus?.paatos?.sisalto}
          maxLength={2000}
          minRows={3}
        ></Textarea>
      </div>

      <FormGroupWithBoldLabel
        label={"Hyväksymispäätös kumottu"}
        errorMessage={
          formState?.errors?.kasittelynTila && (formState?.errors?.kasittelynTila as any)?.hallintoOikeus?.hyvaksymisPaatosKumottu?.message
        }
        flexDirection="col"
      >
        <RadioButton
          id="hoHyvaksymisPaatosKumottuKylla"
          label={"Kyllä"}
          disabled={disabled}
          checked={!!value?.hyvaksymisPaatosKumottu}
          onChange={() => {
            onChange?.({
              ...value,
              hyvaksymisPaatosKumottu: true,
            });
          }}
        />
        <RadioButton
          id="hoHyvaksymisPaatosKumottuEi"
          label="Ei"
          disabled={disabled}
          checked={value?.hyvaksymisPaatosKumottu === false}
          onChange={() => {
            onChange?.({
              ...value,
              hyvaksymisPaatosKumottu: false,
            });
          }}
        />
        <RadioButton
          id="hoHyvaksymisPaatosKumottuEiTiedossa"
          label="Ei tiedossa"
          disabled={disabled}
          checked={value?.hyvaksymisPaatosKumottu === null || value?.hyvaksymisPaatosKumottu === undefined}
          onChange={() => {
            onChange?.({
              valipaatos: {
                paiva: null,
                sisalto: null,
              },
              paatos: {
                paiva: null,
                sisalto: null,
              },
              hyvaksymisPaatosKumottu: undefined,
            });
          }}
        />
      </FormGroupWithBoldLabel>
    </SectionContent>
  );
}

const FormGroupWithBoldLabel = styled(FormGroup)(() => ({
  "> label": {
    fontWeight: "bold",
  },
  label: {
    marginBottom: "0.5rem",
  },
}));
