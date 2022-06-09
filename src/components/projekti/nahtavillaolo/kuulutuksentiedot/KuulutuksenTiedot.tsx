import { yupResolver } from "@hookform/resolvers/yup";
import { TallennaProjektiInput } from "@services/api";
import React, { useEffect } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import NahtavillaoloPainikkeet from "../NahtavillaoloPainikkeet";
import HankkeenSisallonKuvaus from "./HankkeenSisallonKuvaus";
import KuulutuksenJaIlmoituksenEsikatselu from "./KuulutuksenJaIlmoituksenEsikatselu";
import KuulutuksessaEsitettavatYhteystiedot from "./KuulutuksessaEsitettavatYhteystiedot";
import KuulutusJaJulkaisuPaiva from "./KuulutusJaJulkaisuPaiva";
import MuistutustenAntaminen from "./MuistutustenAntaminen";

type Props = {};

export type KuulutuksenTiedotFormValues = Pick<TallennaProjektiInput, "oid">;

export default function NahtavilleAsetettavatAineistot({}: Props) {
  const { data: projekti } = useProjektiRoute();
  const formOptions: UseFormProps<KuulutuksenTiedotFormValues> = {
    resolver: yupResolver(nahtavillaoloAineistotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const useFormReturn = useForm<KuulutuksenTiedotFormValues>(formOptions);
  const { reset } = useFormReturn;

  useEffect(() => {
    if (projekti?.oid) {
      const tallentamisTiedot: KuulutuksenTiedotFormValues = {
        oid: projekti.oid,
      };
      reset(tallentamisTiedot);
    }
  }, [projekti, reset]);

  return (
    <FormProvider {...useFormReturn}>
      <form>
        <KuulutusJaJulkaisuPaiva />
        <MuistutustenAntaminen />
        <HankkeenSisallonKuvaus />
        <KuulutuksessaEsitettavatYhteystiedot />
        <KuulutuksenJaIlmoituksenEsikatselu />
        <NahtavillaoloPainikkeet />
      </form>
    </FormProvider>
  );
}
