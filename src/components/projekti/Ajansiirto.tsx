import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { yupResolver } from "@hookform/resolvers/yup";
import { ProjektiTestCommand } from "common/testUtil.dev";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import * as Yup from "yup";

type FormValues = {
  days: number;
};

const schema = Yup.object().shape({
  days: Yup.number().integer().positive(),
});

const defaultValues: FormValues = {
  days: 0,
};

export default function Ajansiirto({ oid }: { oid: string }) {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const siirraMenneisyyteen = useCallback(
    (formData: FormValues) => {
      window.location.assign(ProjektiTestCommand.oid(oid).ajansiirto(formData.days.toString()));
    },
    [oid]
  );

  return (
    <div
      role="navigation"
      style={{
        marginBottom: "1em",
        padding: "0.1em",
        background: "linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet, red)",
      }}
    >
      <form>
        <div style={{ width: "100%", height: "100%", padding: "1.1em", background: "white" }}>
          <h3 className="text-primary-dark">
            <FontAwesomeIcon icon="magic" className="text-primary-dark m-auto h-full" size="lg" />
            <span style={{ marginLeft: "1em", marginRight: "1em" }}>AJANSIIRTO</span>
          </h3>
          <TextInput
            type="number"
            label="Siirrä projektin päivämääriä x päivää menneisyyteen"
            id="ajansiirto_paiva_lkm"
            {...register("days")}
          />
          <Button
            style={{
              borderRadius: 0,
              marginTop: "0.5em",
            }}
            disabled={!formState.isValid}
            type="button"
            id="ajansiirto_siirra"
            onClick={handleSubmit(siirraMenneisyyteen)}
          >
            <span>Siirrä</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
