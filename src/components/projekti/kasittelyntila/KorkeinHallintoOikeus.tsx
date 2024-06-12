import React from "react";
import { ControllerFieldState, ControllerRenderProps, FormState, useController, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { HassuDatePicker } from "@components/form/HassuDatePicker";
import Textarea from "@components/form/Textarea";
import dayjs, { Dayjs } from "dayjs";
import RadioButton from "@components/form/RadioButton";
import { KasittelynTilaFormValues } from "@pages/yllapito/projekti/[oid]/kasittelyntila";
import styled from "@emotion/styled";
import FormGroup from "@components/form/FormGroup";

type KorkeinHallintoOikeusProps = { disabled: boolean; projekti: ProjektiLisatiedolla; includeInForm: boolean };

export default function KorkeinHallintoOikeus({ projekti, disabled, includeInForm }: KorkeinHallintoOikeusProps) {
  return includeInForm ? (
    <KorkeinHallintoOikeusControlled disabled={disabled} />
  ) : (
    <KorkeinHallintoOikeusContent disabled value={projekti.kasittelynTila?.hallintoOikeus} />
  );
}

function KorkeinHallintoOikeusControlled({ disabled }: { disabled: boolean }) {
  const { formState, control } = useFormContext<KasittelynTilaFormValues>();
  const {
    field: { onChange, value },
    fieldState,
  } = useController({ name: "kasittelynTila.korkeinHallintoOikeus", control });
  return (
    <KorkeinHallintoOikeusContent disabled={disabled} formState={formState} value={value} onChange={onChange} fieldState={fieldState} />
  );
}

function KorkeinHallintoOikeusContent(props: {
  disabled?: boolean;
  formState?: FormState<KasittelynTilaFormValues>;
  value: ControllerRenderProps<KasittelynTilaFormValues, "kasittelynTila.hallintoOikeus">["value"];
  onChange?: ControllerRenderProps<KasittelynTilaFormValues, "kasittelynTila.hallintoOikeus">["onChange"];
  fieldState?: ControllerFieldState;
}) {
  const { value, disabled, fieldState, formState, onChange } = props;
  return (
    <SectionContent>
      <h2 className="vayla-title">Korkein hallinto-oikeus</h2>
      <h3 className="vayla-small-title mt-6 !mb-6">Korkeimman hallinto-oikeuden välipäätös</h3>
      {fieldState?.error?.message && <p className="text-red mb-6">{fieldState.error?.message}</p>}
      <HassuDatePicker
        label="Päivämäärä"
        textFieldProps={{ name: "kasittelynTila.korkeinHallintoOikeus.valipaatos.paiva" }}
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
          label={"Korkeimman hallinto-oikeuden välipäätöksen sisältö"}
          name="kasittelynTila.korkeinHallintoOikeus.valipaatos.sisalto"
          disabled={disabled}
          value={value?.valipaatos?.sisalto || ""}
          onChange={(e) => {
            onChange?.({
              ...value,
              valipaatos: {
                paiva: value?.valipaatos?.paiva,
                sisalto: e.target.value,
              },
            });
          }}
          error={(formState?.errors as any)?.kasittelynTila?.korkeinHallintoOikeus?.valipaatos?.sisalto}
          maxLength={2000}
          minRows={3}
        ></Textarea>
      </div>
      <h3 className="vayla-small-title !mb-6">Korkeimman hallinto-oikeuden päätös</h3>
      <HassuDatePicker
        label="Päivämäärä"
        textFieldProps={{ name: "kasittelynTila.korkeinHallintoOikeus.paatos.paiva" }}
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
          label={"Korkeimman hallinto-oikeuden päätöksen sisältö"}
          name="kasittelynTila.korkeinHallintoOikeus.paatos.sisalto"
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
          error={(formState?.errors as any)?.kasittelynTila?.korkeinHallintoOikeus?.paatos?.sisalto}
          maxLength={2000}
          minRows={3}
        ></Textarea>
      </div>

      <FormGroupWithBoldLabel
        label={"Hyväksymispäätös kumottu"}
        errorMessage={(formState?.errors?.kasittelynTila as any)?.korkeinHallintoOikeus?.hyvaksymisPaatosKumottu?.message}
        flexDirection="col"
      >
        <RadioButton
          id="khoHyvaksymisPaatosKumottuKyllä"
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
          id="khoHyvaksymisPaatosKumottuEi"
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
          id="khoHyvaksymisPaatosKumottuEiTiedossa"
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
