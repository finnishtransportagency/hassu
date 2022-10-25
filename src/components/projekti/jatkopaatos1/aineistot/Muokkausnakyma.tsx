import { yupResolver } from "@hookform/resolvers/yup";
import { Aineisto, AineistoInput, TallennaProjektiInput } from "@services/api";
import React, { ReactElement, useEffect, useMemo } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import Jatkopaatos1VaihePainikkeet from "./Jatkopaatos1VaihePainikkeet";
import Jatkopaatos1 from "./Jatkopaatos1";
import SuunnitelmatJaAineistot from "../../common/SuunnitelmatJaAineistot";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { aineistoKategoriat } from "common/aineistoKategoriat";
import Notification, { NotificationType } from "@components/notification/Notification";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import useIsAllowedOnCurrentProjektiRoute from "src/hooks/useIsOnAllowedProjektiRoute";

interface AineistoNahtavilla {
  [kategoriaId: string]: AineistoInput[];
}

type FormData = {
  aineistoNahtavilla: AineistoNahtavilla;
  hyvaksymisPaatos: AineistoInput[];
};

export type JatkoPaatos1VaiheAineistotFormValues = Pick<TallennaProjektiInput, "oid"> & FormData;

const getDefaultValueForAineistoNahtavilla = (aineistot: Aineisto[] | undefined | null) => {
  return aineistoKategoriat.listKategoriaIds().reduce<AineistoNahtavilla>((aineistoNahtavilla, currentKategoriaId) => {
    aineistoNahtavilla[currentKategoriaId] =
      aineistot
        ?.filter((aineisto) => aineisto.kategoriaId === currentKategoriaId)
        .map<AineistoInput>((aineisto) => ({
          dokumenttiOid: aineisto.dokumenttiOid,
          nimi: aineisto.nimi,
          jarjestys: aineisto.jarjestys,
          kategoriaId: aineisto.kategoriaId,
        })) || [];
    return aineistoNahtavilla;
  }, {});
};

interface Props {
  setIsDirty: (value: React.SetStateAction<boolean>) => void;
}

export default function Muokkausnakyma({ setIsDirty }: Props): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });

  return <>{projekti && <MuokkausnakymaForm projekti={projekti} setIsDirty={setIsDirty} />}</>;
}

interface MuokkausnakymaFormProps {
  projekti: ProjektiLisatiedolla;
}

function MuokkausnakymaForm({ projekti, setIsDirty }: MuokkausnakymaFormProps & Props) {
  const defaultValues: JatkoPaatos1VaiheAineistotFormValues = useMemo(() => {
    const hyvaksymisPaatos: AineistoInput[] =
      projekti.jatkoPaatos1Vaihe?.hyvaksymisPaatos?.map(({ dokumenttiOid, nimi, jarjestys }) => ({
        dokumenttiOid,
        jarjestys,
        nimi,
      })) || [];

    return {
      oid: projekti.oid,
      aineistoNahtavilla: getDefaultValueForAineistoNahtavilla(projekti.jatkoPaatos1Vaihe?.aineistoNahtavilla),
      hyvaksymisPaatos,
    };
  }, [projekti]);

  const formOptions: UseFormProps<JatkoPaatos1VaiheAineistotFormValues> = {
    resolver: yupResolver(nahtavillaoloAineistotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  };

  const useFormReturn = useForm<JatkoPaatos1VaiheAineistotFormValues>(formOptions);
  const {
    formState: { isDirty },
  } = useFormReturn;

  const { isAllowedOnRoute } = useIsAllowedOnCurrentProjektiRoute();

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  useLeaveConfirm(isDirty);

  return (
    <FormProvider {...useFormReturn}>
      <h3 className="vayla-small-title">Päätös ja päätöksen liitteenä olevat aineistot</h3>
      <p>
        Liitä kuulutukselle Liikenne- ja viestintäviraston päätös sekä jatkopäätös. Liitettävät päätökset sekä päätösten liitteenä olevat
        aineistot haetaan Projektivelhosta. Päätökset ja sen liitteenä oleva aineisto julkaistaan palvelun julkisella puolella kuulutuksen
        julkaisupäivänä.
      </p>
      <Notification type={NotificationType.INFO_GRAY}>
        Huomioithan, että suunnitelma-aineistojen tulee täyttää saavutettavuusvaatimukset.
      </Notification>
      <form>
        <fieldset disabled={!isAllowedOnRoute || !projekti.nykyinenKayttaja.omaaMuokkausOikeuden}>
          <Jatkopaatos1 />
          <SuunnitelmatJaAineistot />
          <Jatkopaatos1VaihePainikkeet />
        </fieldset>
      </form>
    </FormProvider>
  );
}
