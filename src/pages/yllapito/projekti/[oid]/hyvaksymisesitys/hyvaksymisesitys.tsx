import React, { ReactElement, useEffect, useMemo } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import ProjektiConsumerComponent from "@components/projekti/ProjektiConsumer";
import HyvaksymisesitysPageLayout from "@components/projekti/hyvaksymisesitys/HyvaksymisesitysPageLayout";
import { Hyvaksymisesitys, Laskutustiedot, LaskutustiedotInput } from "@services/api";
import { uuid } from "common/util/uuid";
import { FormProvider, UseFormProps, useFieldArray, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { lausuntopyynnotSchema } from "src/schemas/lausuntoPyynnot";
import SectionContent from "@components/layout/SectionContent";
import HyvaksymisesitysPainikkeet from "@components/projekti/hyvaksymisesitys/HyvaksymisesitysForm/HyvaksymisesitysPainikkeet";
import { HyvaksymisesitysFormValues, HyvaksymisesitysLisakentilla } from "@components/projekti/hyvaksymisesitys/types";
import { handleLadattuTiedostoArrayForDefaultValues } from "@components/projekti/lausuntopyynnot/util";
import { reduceToLisatytJaPoistetut } from "src/util/reduceToLisatytJaPoistetut";
import dayjs from "dayjs";
import HyvaksymisesitysForm from "@components/projekti/hyvaksymisesitys/HyvaksymisesitysForm";

export default function HyvaksymisesitystWrapper() {
  useProjekti({ revalidateOnMount: true });
  return (
    <ProjektiConsumerComponent useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <Hyvaksymisesitykset projekti={projekti} />}
    </ProjektiConsumerComponent>
  );
}

const getDefaultLausuntoPyynto: () => HyvaksymisesitysLisakentilla = () => ({
  uuid: uuid.v4(),
  poistumisPaiva: dayjs(new Date()).add(180, "day").format("YYYY-MM-DD"),
  kunta: 1,
  viesti: "",
  laskutustiedot: { yTunnus: "", ovtTunnus: "", verkkolaskuoperaattorinTunnus: "", viitetieto: "" },
  suunnitelma: [],
  poistettuSuunnitelma: [],
  muistutukset: [],
  poistetutMuistutukset: [],
  lausunnot: [],
  poistetutLausunnot: [],
  maanomistajaluettelo: [],
  poistettuMaanomistajaluettelo: [],
  kuulutuksetJaKutsut: [],
  poistetutKuulutuksetJaKutsut: [],
  muuAineistoLadattu: [],
  poistetutMuuAineistoLadattu: [],
  muuAineistoVelhosta: [],
  tallennettu: false,
});

function adaptLaskutustiedotToLaskutustiedotInput(laskutustiedot: Laskutustiedot): LaskutustiedotInput {
  const yTunnus = laskutustiedot.yTunnus ?? "";
  const ovtTunnus = laskutustiedot.ovtTunnus ?? "";
  const verkkolaskuoperaattorinTunnus = laskutustiedot.verkkolaskuoperaattorinTunnus ?? "";
  const viitetieto = laskutustiedot.viitetieto ?? "";
  return { yTunnus, ovtTunnus, verkkolaskuoperaattorinTunnus, viitetieto };
}

function adaptHyvaksymisesitysToHyvaksymisesitysLisakentilla(hyvaksymisesitys: Hyvaksymisesitys): HyvaksymisesitysLisakentilla {
  const { lisatty: suunnitelma, poistettu: poistettuSuunnitelma } = handleLadattuTiedostoArrayForDefaultValues(
    hyvaksymisesitys.suunnitelma,
    true
  );
  const { lisatty: muistutukset, poistettu: poistetutMuistutukset } = handleLadattuTiedostoArrayForDefaultValues(
    hyvaksymisesitys.muistutukset,
    true
  );
  const { lisatty: lausunnot, poistettu: poistetutLausunnot } = handleLadattuTiedostoArrayForDefaultValues(
    hyvaksymisesitys.lausunnot,
    true
  );
  const { lisatty: maanomistajaluettelo, poistettu: poistettuMaanomistajaluettelo } = handleLadattuTiedostoArrayForDefaultValues(
    hyvaksymisesitys.maanomistajaluettelo,
    true
  );
  const { lisatty: kuulutuksetJaKutsut, poistettu: poistetutKuulutuksetJaKutsut } = handleLadattuTiedostoArrayForDefaultValues(
    hyvaksymisesitys.kuulutuksetJaKutsut,
    true
  );
  const { lisatty: muuAineistoLadattu, poistettu: poistetutMuuAineistoLadattu } = handleLadattuTiedostoArrayForDefaultValues(
    hyvaksymisesitys.muuAineistoLadattu,
    true
  );
  return {
    uuid: hyvaksymisesitys.uuid,
    kunta: hyvaksymisesitys.kunta,
    laskutustiedot: adaptLaskutustiedotToLaskutustiedotInput(hyvaksymisesitys.laskutustiedot),
    poistumisPaiva: hyvaksymisesitys.poistumisPaiva,
    viesti: hyvaksymisesitys.viesti ?? "",
    kiireellinenKasittely: hyvaksymisesitys.kiireellinenKasittely ?? false,
    suunnitelma,
    poistettuSuunnitelma,
    muistutukset,
    poistetutMuistutukset,
    lausunnot,
    poistetutLausunnot,
    maanomistajaluettelo,
    poistettuMaanomistajaluettelo,
    kuulutuksetJaKutsut,
    poistetutKuulutuksetJaKutsut,
    muuAineistoLadattu,
    poistetutMuuAineistoLadattu,
    muuAineistoVelhosta: hyvaksymisesitys.muuAineistoVelhosta,
    tallennettu: true,
  };
}

const Hyvaksymisesitykset = ({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement => {
  const defaultValues: HyvaksymisesitysFormValues = useMemo(() => {
    const { lisatty, poistettu } = (projekti.hyvaksymisesitys || []).reduce(
      reduceToLisatytJaPoistetut<Hyvaksymisesitys>({ onPoistettu: (lp: Hyvaksymisesitys) => !!lp.poistetaan }),
      { lisatty: [] as Hyvaksymisesitys[], poistettu: [] as Hyvaksymisesitys[] }
    );
    const hyvaksymisesitykset = lisatty.length
      ? lisatty.map(adaptHyvaksymisesitysToHyvaksymisesitysLisakentilla)
      : [getDefaultLausuntoPyynto()];
    return {
      oid: projekti.oid,
      versio: projekti.versio,
      hyvaksymisesitykset,
      poistetutHyvaksymisesitykset: poistettu.map(adaptHyvaksymisesitysToHyvaksymisesitysLisakentilla) || [],
    };
  }, [projekti]);

  const formOptions: UseFormProps<HyvaksymisesitysFormValues, ProjektiValidationContext> = {
    resolver: yupResolver(lausuntopyynnotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: { projekti },
  };

  const useFormReturn = useForm<HyvaksymisesitysFormValues, ProjektiValidationContext>(formOptions);
  const {
    control,
    reset,
    formState: { isDirty },
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const { fields, remove } = useFieldArray({
    control,
    name: `hyvaksymisesitykset`,
  });

  return (
    <HyvaksymisesitysPageLayout>
      <FormProvider {...useFormReturn}>
        {fields.map((field, index) => (
          <SectionContent key={field.id}>
            <HyvaksymisesitysForm index={index} projekti={projekti} remove={remove} />
          </SectionContent>
        ))}

        <HyvaksymisesitysPainikkeet projekti={projekti} />
      </FormProvider>
    </HyvaksymisesitysPageLayout>
  );
};
