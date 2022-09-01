import { yupResolver } from "@hookform/resolvers/yup";
import { Aineisto, AineistoInput, TallennaProjektiInput } from "@services/api";
import React, { ReactElement, useMemo } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import HyvaksymisPaatosVaihePainikkeet from "./HyvaksymisPaatosVaihePainikkeet";
import Hyvaksymispaatos from "./Hyvaksymispaatos";
import SuunnitelmatJaAineistot from "../../common/SuunnitelmatJaAineistot";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { aineistoKategoriat } from "common/aineistoKategoriat";
import Notification, { NotificationType } from "@components/notification/Notification";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";

interface AineistoNahtavilla {
  [kategoriaId: string]: AineistoInput[];
}

type FormData = {
  aineistoNahtavilla: AineistoNahtavilla;
  hyvaksymisPaatos: AineistoInput[];
};

export type HyvaksymisPaatosVaiheAineistotFormValues = Pick<TallennaProjektiInput, "oid"> & FormData;

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

export default function Muokkausnakyma(): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });

  return <>{projekti && <MuokkausnakymaForm projekti={projekti} />}</>;
}

interface MuokkausnakymaFormProps {
  projekti: ProjektiLisatiedolla;
}

function MuokkausnakymaForm({ projekti }: MuokkausnakymaFormProps) {
  const defaultValues: HyvaksymisPaatosVaiheAineistotFormValues = useMemo(() => {
    const hyvaksymisPaatos: AineistoInput[] =
      projekti.hyvaksymisPaatosVaihe?.hyvaksymisPaatos?.map(({ dokumenttiOid, nimi, jarjestys }) => ({
        dokumenttiOid,
        jarjestys,
        nimi,
      })) || [];

    return {
      oid: projekti.oid,
      aineistoNahtavilla: getDefaultValueForAineistoNahtavilla(projekti.hyvaksymisPaatosVaihe?.aineistoNahtavilla),
      hyvaksymisPaatos,
    };
  }, [projekti]);

  const formOptions: UseFormProps<HyvaksymisPaatosVaiheAineistotFormValues> = {
    resolver: yupResolver(nahtavillaoloAineistotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  };

  const useFormReturn = useForm<HyvaksymisPaatosVaiheAineistotFormValues>(formOptions);
  const {
    formState: { isDirty },
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  return (
    <FormProvider {...useFormReturn}>
      <h3 className="vayla-small-title">Päätös ja päätöksen liitteenä olevat aineistot</h3>
      <p>
        Liitä Liikenne- ja viestintäviraston päätös. Liitettävä päätös haetaan Projektivelhosta. Päätös ja sen liitteenä
        oleva aineisto julkaistaan palvelun julkisella puolella kuulutuksen julkaisupäivänä.
      </p>
      <Notification type={NotificationType.INFO_GRAY}>
        Huomioithan, että suunnitelma-aineistojen tulee täyttää saavutettavuusvaatimukset.
      </Notification>
      <form>
        <Hyvaksymispaatos projekti={projekti} />
        <SuunnitelmatJaAineistot />
        <HyvaksymisPaatosVaihePainikkeet />
      </form>
    </FormProvider>
  );
}
