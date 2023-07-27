import { yupResolver } from "@hookform/resolvers/yup";
import { AineistoInput, TallennaProjektiInput } from "@services/api";
import React, { ReactElement, useEffect, useMemo } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import HyvaksymisPaatosVaihePainikkeet from "./HyvaksymisPaatosVaihePainikkeet";
import SuunnitelmatJaAineistot, { SuunnitelmatJaAineistotProps } from "../../common/SuunnitelmatJaAineistot";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { aineistoKategoriat, kategorisoimattomatId } from "common/aineistoKategoriat";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { PaatosSpecificData, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import useIsAllowedOnCurrentProjektiRoute from "src/hooks/useIsOnAllowedProjektiRoute";
import { aineistoToSplitAineistoInput } from "src/util/aineistoToSplitAineistoInput";

interface AineistoNahtavilla {
  [kategoriaId: string]: AineistoInput[];
}

type FormData = {
  aineistoNahtavilla: AineistoNahtavilla;
  poistetutAineistoNahtavilla: AineistoInput[];
  poistetutHyvaksymisPaatos: AineistoInput[];
  hyvaksymisPaatos: AineistoInput[];
};

export type HyvaksymisPaatosVaiheAineistotFormValues = Pick<TallennaProjektiInput, "oid" | "versio"> & FormData;

const getDefaultValueForAineistoNahtavilla = (aineistot: AineistoInput[] | undefined | null) => {
  const kategoriaIds = aineistoKategoriat.listKategoriaIds();
  const initialAineistoKategorias = aineistoKategoriat.listKategoriaIds().reduce<AineistoNahtavilla>((acc, kategoriaId) => {
    acc[kategoriaId] = [];
    return acc;
  }, {});

  return (
    aineistot?.reduce<AineistoNahtavilla>((aineistoNahtavilla, aineisto) => {
      if (aineisto.kategoriaId && kategoriaIds.includes(aineisto.kategoriaId)) {
        aineistoNahtavilla[aineisto.kategoriaId].push(aineisto);
      } else {
        aineistoNahtavilla[kategorisoimattomatId].push(aineisto);
      }
      return aineistoNahtavilla;
    }, initialAineistoKategorias) || initialAineistoKategorias
  );
};

export default function Muokkausnakyma({
  julkaisematonPaatos,
  paatosTyyppi,
}: Pick<PaatosSpecificData, "julkaisematonPaatos"> & { paatosTyyppi: PaatosTyyppi }): ReactElement {
  const { data: projekti } = useProjekti();

  return (
    <>{projekti && <MuokkausnakymaForm projekti={projekti} julkaisematonPaatos={julkaisematonPaatos} paatosTyyppi={paatosTyyppi} />}</>
  );
}

interface MuokkausnakymaFormProps {
  projekti: ProjektiLisatiedolla;
  paatosTyyppi: PaatosTyyppi;
}

const hyvaksymisPaatosSuunnitelmatJaAineistotProps: Omit<SuunnitelmatJaAineistotProps, "vaihe"> = {
  sectionTitle: "Päätös ja päätöksen liitteenä oleva aineisto",
  sectionInfoText:
    "Liitä Liikenne- ja viestintävirasto Traficomin tekemä hyväksymispäätös. Jos päätöksestä on toimitettu kaksi versiota, lisää ei-henkilötietoja sisältävä kuulutusversio. Liitettävä päätös haetaan Projektivelhosta. Päätös ja sen liitteenä oleva aineisto julkaistaan palvelun julkisella puolella kuulutuksen julkaisupäivänä.",
  dialogInfoText: "Valitse tiedostot, jotka haluat tuoda päätöksen liitteeksi.",
  sectionSubtitle: "Päätöksen liitteenä oleva aineisto",
  paatos: {
    paatosInfoText:
      "Liitä Liikenne- ja viestintäviraston päätös. Päätöksen päivämäärä sekä asiatunnus löytyvät Kuulutuksen tiedot -välilehdellä, jos ne on lisätty Käsittelyn tila -sivulle.",
    paatosSubtitle: "Päätös *",
  },
};

const jatkopaatosPaatosSuunnitelmatProps: Omit<SuunnitelmatJaAineistotProps, "vaihe"> = {
  ...hyvaksymisPaatosSuunnitelmatJaAineistotProps,
  sectionInfoText:
    "Liitä kuulutukselle Liikenne- ja viestintäviraston päätös sekä jatkopäätös. Liitettävät päätökset sekä päätösten liitteenä olevat aineistot haetaan Projektivelhosta. Päätökset ja sen liitteenä oleva aineisto julkaistaan palvelun julkisella puolella kuulutuksen julkaisupäivänä.",
  paatos: {
    paatosSubtitle: "Päätös ja jatkopäätös *",
    paatosInfoText:
      "Liitä Liikenne- ja viestintäviraston päätökset suunnitelman hyväksymisestä sekä päätös suunnitelman voimassaoloajan pidentämisestä. Jatkopäätöksen päivämäärä sekä asiatunnus löytyvät automaattisesti Kuulutuksen tiedot -välilehdeltä.",
  },
};

const paatosTyyppiToSuunnitelmatJaAineistotPropsMap: Record<PaatosTyyppi, Omit<SuunnitelmatJaAineistotProps, "vaihe">> = {
  HYVAKSYMISPAATOS: hyvaksymisPaatosSuunnitelmatJaAineistotProps,
  JATKOPAATOS1: jatkopaatosPaatosSuunnitelmatProps,
  JATKOPAATOS2: jatkopaatosPaatosSuunnitelmatProps,
};

function MuokkausnakymaForm({
  projekti,
  julkaisematonPaatos,
  paatosTyyppi,
}: MuokkausnakymaFormProps & Pick<PaatosSpecificData, "julkaisematonPaatos">) {
  const defaultValues: HyvaksymisPaatosVaiheAineistotFormValues = useMemo(() => {
    const { lisatty: hyvaksymisPaatos, poistettu: poistetutHyvaksymisPaatos } = aineistoToSplitAineistoInput(
      julkaisematonPaatos?.hyvaksymisPaatos
    );
    const { lisatty: aineistoNahtavilla, poistettu: poistetutAineistoNahtavilla } = aineistoToSplitAineistoInput(
      julkaisematonPaatos?.aineistoNahtavilla
    );

    const defaultFormValues: HyvaksymisPaatosVaiheAineistotFormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      aineistoNahtavilla: getDefaultValueForAineistoNahtavilla(aineistoNahtavilla),
      poistetutAineistoNahtavilla,
      poistetutHyvaksymisPaatos,
      hyvaksymisPaatos,
    };
    return defaultFormValues;
  }, [julkaisematonPaatos, projekti.oid, projekti.versio]);

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

  const { isAllowedOnRoute } = useIsAllowedOnCurrentProjektiRoute();

  useLeaveConfirm(isDirty);

  const { reset } = useFormReturn;
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <FormProvider {...useFormReturn}>
      <form>
        <fieldset disabled={!isAllowedOnRoute || !projekti.nykyinenKayttaja.omaaMuokkausOikeuden}>
          <SuunnitelmatJaAineistot {...paatosTyyppiToSuunnitelmatJaAineistotPropsMap[paatosTyyppi]} vaihe={julkaisematonPaatos} />
          <HyvaksymisPaatosVaihePainikkeet paatosTyyppi={paatosTyyppi} />
        </fieldset>
      </form>
    </FormProvider>
  );
}
