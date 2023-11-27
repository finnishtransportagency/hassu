import React, { ReactElement, useEffect, useMemo } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import ProjektiConsumerComponent from "@components/projekti/ProjektiConsumer";
import LausuntopyynnotPageLayout from "@components/projekti/lausuntopyynnot/LausuntoPyynnotPageLayout";
import Section from "@components/layout/Section2";
import { LausuntoPyynto } from "@services/api";
import { uuid } from "common/util/uuid";
import { FormProvider, UseFormProps, useFieldArray, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { lausuntopyynnotSchema } from "src/schemas/lausuntoPyynnot";
import SectionContent from "@components/layout/SectionContent";
import LausuntoPyyntoForm from "@components/projekti/lausuntopyynnot/LausuntoPyyntoForm";
import LausuntoPyynnotPainikkeet from "@components/projekti/lausuntopyynnot/LausuntoPyyntoForm/LausuntoPyynnotPainikkeet";
import Button from "@components/button/Button";
import { LausuntoPyynnotFormValues, LausuntoPyyntoLisakentilla } from "@components/projekti/lausuntopyynnot/types";
import { handleLadattuTiedostoArrayForDefaultValues } from "@components/projekti/lausuntopyynnot/util";
import { reduceToLisatytJaPoistetut } from "src/util/reduceToLisatytJaPoistetut";
import dayjs from "dayjs";

export default function LausuntoPyynnotWrapper() {
  useProjekti({ revalidateOnMount: true });
  return (
    <ProjektiConsumerComponent useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <LausuntoPyynnot projekti={projekti} />}
    </ProjektiConsumerComponent>
  );
}

const defaultLausuntoPyynto: LausuntoPyyntoLisakentilla = {
  uuid: uuid.v4(),
  poistumisPaiva: dayjs(new Date()).add(180, "day").format("YYYY-MM-DD"),
  lisaAineistot: [],
  poistetutLisaAineistot: [],
  muistiinpano: "",
  tallennettu: false,
};

function adaptLausuntoPyyntoToLausuntoPyyntoLisakentilla(lausuntoPyynto: LausuntoPyynto) {
  const { lisatty: lisaAineistot, poistettu: poistetutLisaAineistot } = handleLadattuTiedostoArrayForDefaultValues(
    lausuntoPyynto.lisaAineistot,
    true
  );
  return {
    uuid: lausuntoPyynto.uuid,
    poistumisPaiva: lausuntoPyynto.poistumisPaiva,
    lisaAineistot: lisaAineistot,
    poistetutLisaAineistot,
    muistiinpano: lausuntoPyynto.muistiinpano,
    tallennettu: true,
  };
}

const LausuntoPyynnot = ({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement => {
  const defaultValues: LausuntoPyynnotFormValues = useMemo(() => {
    const { lisatty, poistettu } = (projekti.lausuntoPyynnot || []).reduce(
      reduceToLisatytJaPoistetut<LausuntoPyynto>({ onPoistettu: (lp: LausuntoPyynto) => !!lp.poistetaan }),
      { lisatty: [] as LausuntoPyynto[], poistettu: [] as LausuntoPyynto[] }
    );
    const lausuntoPyynnot = lisatty.length ? lisatty.map(adaptLausuntoPyyntoToLausuntoPyyntoLisakentilla) : [defaultLausuntoPyynto];
    return {
      oid: projekti.oid,
      versio: projekti.versio,
      lausuntoPyynnot,
      poistetutLausuntoPyynnot: poistettu.map(adaptLausuntoPyyntoToLausuntoPyyntoLisakentilla) || [],
    };
  }, [projekti]);

  const formOptions: UseFormProps<LausuntoPyynnotFormValues, ProjektiValidationContext> = {
    resolver: yupResolver(lausuntopyynnotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: { projekti },
  };

  const useFormReturn = useForm<LausuntoPyynnotFormValues, ProjektiValidationContext>(formOptions);
  const {
    control,
    reset,
    formState: { isDirty },
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: `lausuntoPyynnot`,
  });

  return (
    <LausuntopyynnotPageLayout>
      <FormProvider {...useFormReturn}>
        {fields.map((field, index) => (
          <SectionContent key={field.id}>
            <LausuntoPyyntoForm index={index} projekti={projekti} remove={remove} />
          </SectionContent>
        ))}
        <Section>
          <h2 className="vayla-subtitle">Luo uusi aineistolinkki</h2>
          <Button
            id="add_new_lausuntopyynto"
            type="button"
            onClick={() => {
              append(defaultLausuntoPyynto);
            }}
          >
            Lisää uusi +
          </Button>
        </Section>

        <Section noDivider>
          <h2 className="vayla-subtitle">Lausuntopyynnon mallipohjat</h2>
          <p>
            Alla löydät linkit viimeisimpiin lausuntopyyntöjen mallipohjiin. Lataa lausuntopyynnön mallipohja tietokoneellesi ja täytä sen
            sisältö. Vie valmislausuntopyyntö asianhallintaan allekirjoitettavaksi.
          </p>
        </Section>
        <LausuntoPyynnotPainikkeet projekti={projekti} />
      </FormProvider>
    </LausuntopyynnotPageLayout>
  );
};
