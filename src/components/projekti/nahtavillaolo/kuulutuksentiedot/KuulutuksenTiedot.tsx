import { yupResolver } from "@hookform/resolvers/yup";
import { TallennaProjektiInput } from "@services/api";
import React from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";
import { nahtavillaoloKuulutusSchema } from "src/schemas/nahtavillaoloKuulutus";
import { removeTypeName } from "src/util/removeTypeName";
import NahtavillaoloPainikkeet from "../NahtavillaoloPainikkeet";
import HankkeenSisallonKuvaus from "./HankkeenSisallonKuvaus";
import KuulutuksenJaIlmoituksenEsikatselu from "./KuulutuksenJaIlmoituksenEsikatselu";
import KuulutuksessaEsitettavatYhteystiedot from "./KuulutuksessaEsitettavatYhteystiedot";
import KuulutusJaJulkaisuPaiva from "./KuulutusJaJulkaisuPaiva";

type Props = {};

export type KuulutuksenTiedotFormValues = Pick<TallennaProjektiInput, "oid" | "nahtavillaoloVaihe">;

export default function KuulutuksenTiedot({}: Props) {
  const { data: projekti } = useProjektiRoute();

  const formOptions: UseFormProps<KuulutuksenTiedotFormValues> = {
    resolver: yupResolver(nahtavillaoloKuulutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      oid: projekti?.oid,
      nahtavillaoloVaihe: {
        kuulutusPaiva: projekti?.nahtavillaoloVaihe?.kuulutusPaiva,
        kuulutusVaihePaattyyPaiva: projekti?.nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva,
        muistutusoikeusPaattyyPaiva: projekti?.nahtavillaoloVaihe?.muistutusoikeusPaattyyPaiva,
        hankkeenKuvaus: removeTypeName(projekti?.nahtavillaoloVaihe?.hankkeenKuvaus),
        kuulutusYhteystiedot: projekti?.nahtavillaoloVaihe?.kuulutusYhteystiedot
          ? projekti.nahtavillaoloVaihe.kuulutusYhteystiedot.map((yhteystieto) => removeTypeName(yhteystieto))
          : [],
        kuulutusYhteysHenkilot:
          projekti?.kayttoOikeudet
            ?.filter(({ kayttajatunnus }) =>
              projekti?.nahtavillaoloVaihe?.kuulutusYhteysHenkilot?.includes(kayttajatunnus)
            )
            .map(({ kayttajatunnus }) => kayttajatunnus) || [],
      },
    },
  };

  const useFormReturn = useForm<KuulutuksenTiedotFormValues>(formOptions);

  return (
    <FormProvider {...useFormReturn}>
      <form>
        <KuulutusJaJulkaisuPaiva />
        <HankkeenSisallonKuvaus kielitiedot={projekti?.kielitiedot} />
        <KuulutuksessaEsitettavatYhteystiedot />
        <KuulutuksenJaIlmoituksenEsikatselu />
        <NahtavillaoloPainikkeet />
      </form>
    </FormProvider>
  );
}
