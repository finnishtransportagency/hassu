import { yupResolver } from "@hookform/resolvers/yup";
import { Aineisto, AineistoInput, TallennaProjektiInput } from "@services/api";
import React, { ReactElement, useEffect, useMemo } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import Jatkopaatos1VaihePainikkeet from "./Jatkopaatos1VaihePainikkeet";
import SuunnitelmatJaAineistot from "../../common/SuunnitelmatJaAineistot";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { aineistoKategoriat } from "common/aineistoKategoriat";
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
      <form>
        <fieldset disabled={!isAllowedOnRoute || !projekti.nykyinenKayttaja.omaaMuokkausOikeuden}>
          <SuunnitelmatJaAineistot
            sectionTitle="Päätös ja päätöksen liitteenä oleva aineistot"
            sectionInfoText="Liitä kuulutukselle Liikenne- ja viestintäviraston päätös sekä jatkopäätös. Liitettävät päätökset sekä päätösten liitteenä olevat aineistot haetaan Projektivelhosta. Päätökset ja sen liitteenä oleva aineisto julkaistaan palvelun julkisella puolella kuulutuksen julkaisupäivänä."
            dialogInfoText="Valitse tiedostot,
            jotka haluat tuoda päätöksen liitteeksi."
            sectionSubtitle="Päätöksen liitteenä oleva aineisto"
            paatos={{
              paatosInfoText:
                "Liitä Liikenne- ja viestintäviraston päätökset suunnitelman hyväksymisestä sekä päätös suunnitelman voimassaoloajan pidentämisestä. Jatkopäätöksen päivämäärä sekä asiatunnus löytyvät automaattisesti Kuulutuksen tiedot -välilehdeltä.",
              paatosSubtitle: "Päätös ja jatkopäätös *",
            }}
          />
          <Jatkopaatos1VaihePainikkeet />
        </fieldset>
      </form>
    </FormProvider>
  );
}
