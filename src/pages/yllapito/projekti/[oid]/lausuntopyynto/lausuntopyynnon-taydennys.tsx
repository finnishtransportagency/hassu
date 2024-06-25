import React, { ReactElement, useEffect, useMemo } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import ProjektiConsumerComponent from "@components/projekti/ProjektiConsumer";
import LausuntopyynnotPageLayout from "@components/projekti/lausuntopyynnot/LausuntoPyynnotPageLayout";
import Section from "@components/layout/Section2";
import { LadattuTiedosto, LausuntoPyynnonTaydennys, ProjektiTyyppi } from "@services/api";
import { uuid } from "common/util/uuid";
import { FormProvider, UseFormProps, useFieldArray, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { lausuntopyynnonTaydennyksetSchema } from "src/schemas/lausuntoPyynnot";
import SectionContent from "@components/layout/SectionContent";
import { ladattuTiedostoTilaEiPoistettu } from "common/util/tiedostoTilaUtil";
import { assertIsDefined } from "backend/src/util/assertions";
import LausuntoPyynnonTaydennysForm from "@components/projekti/lausuntopyynnot/LausuntoPyynnonTaydennysForm";
import LausuntoPyynnonTaydennysPainikkeet from "@components/projekti/lausuntopyynnot/LausuntoPyynnonTaydennysForm/LausuntoPyynnonTaydennysPainikkeet";
import { LausuntoPyynnonTaydennysFormValues, LausuntoPyynnonTaydennysLisakentilla } from "@components/projekti/lausuntopyynnot/types";
import { handleLadattuTiedostoArrayForDefaultValues } from "@components/projekti/lausuntopyynnot/util";
import { reduceToLisatytJaPoistetut } from "src/util/reduceToLisatytJaPoistetut";
import dayjs from "dayjs";
import DownloadButtonLink from "@components/button/DownloadButtonLink";
import { H2 } from "../../../../../components/Headings";

export default function LausuntoPyynnonTaydennysWrapper() {
  useProjekti({ revalidateOnMount: true });
  return (
    <ProjektiConsumerComponent useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <LausuntoPyynnonTaydennyksetForm projekti={projekti} />}
    </ProjektiConsumerComponent>
  );
}

const defaultLausuntoPyynnonTaydennys: (kuntaId: number) => LausuntoPyynnonTaydennysLisakentilla = (kuntaId: number) => ({
  uuid: uuid.v4(),
  kunta: kuntaId,
  poistumisPaiva: dayjs(new Date()).add(180, "day").format("YYYY-MM-DD"),
  muuAineisto: [],
  poistetutMuuAineisto: [],
  muistutukset: [],
  poistetutMuistutukset: [],
  tallennettu: false,
});

function adaptLausuntoPyynnonTaydennysToLausuntoPyynnonTaydennysLisakentilla(lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys) {
  const { lisatty: muuAineisto, poistettu: poistetutMuuAineisto } = handleLadattuTiedostoArrayForDefaultValues(
    lausuntoPyynnonTaydennys.muuAineisto,
    true
  );
  const { lisatty: muistutukset, poistettu: poistetutMuistutukset } = (lausuntoPyynnonTaydennys.muistutukset || []).reduce(
    reduceToLisatytJaPoistetut<LadattuTiedosto>({
      onPoistettu: (muistutus: LadattuTiedosto) => !ladattuTiedostoTilaEiPoistettu(muistutus.tila),
    }),
    { lisatty: [] as LadattuTiedosto[], poistettu: [] as LadattuTiedosto[] }
  );

  return {
    uuid: lausuntoPyynnonTaydennys.uuid,
    poistumisPaiva: lausuntoPyynnonTaydennys.poistumisPaiva,
    muuAineisto,
    poistetutMuuAineisto,
    muistutukset,
    poistetutMuistutukset,
    kunta: lausuntoPyynnonTaydennys.kunta,
    tallennettu: true,
  };
}

const LausuntoPyynnonTaydennyksetForm = ({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement => {
  const defaultValues: LausuntoPyynnonTaydennysFormValues = useMemo(() => {
    const kunnat = projekti.velho.kunnat;
    assertIsDefined(kunnat);
    const { lisatty, poistettu } = (projekti.lausuntoPyynnonTaydennykset || []).reduce(
      reduceToLisatytJaPoistetut<LausuntoPyynnonTaydennys>({ onPoistettu: (lp: LausuntoPyynnonTaydennys) => !!lp.poistetaan }),
      { lisatty: [] as LausuntoPyynnonTaydennys[], poistettu: [] as LausuntoPyynnonTaydennys[] }
    );

    return {
      oid: projekti.oid,
      versio: projekti.versio,
      lausuntoPyynnonTaydennykset: projekti.lausuntoPyynnonTaydennykset?.length
        ? lisatty.map(adaptLausuntoPyynnonTaydennysToLausuntoPyynnonTaydennysLisakentilla)
        : kunnat.map((kuntaId) => defaultLausuntoPyynnonTaydennys(kuntaId)),
      poistetutLausuntoPyynnonTaydennykset: poistettu.map(adaptLausuntoPyynnonTaydennysToLausuntoPyynnonTaydennysLisakentilla) || [],
    };
  }, [projekti]);

  const formOptions: UseFormProps<LausuntoPyynnonTaydennysFormValues, ProjektiValidationContext> = {
    resolver: yupResolver(lausuntopyynnonTaydennyksetSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: { projekti },
  };

  const useFormReturn = useForm<LausuntoPyynnonTaydennysFormValues, ProjektiValidationContext>(formOptions);
  const {
    control,
    reset,
    formState: { isDirty },
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const { fields } = useFieldArray({
    control,
    name: `lausuntoPyynnonTaydennykset`,
  });

  return (
    <LausuntopyynnotPageLayout>
      <FormProvider {...useFormReturn}>
        {fields.map((field, index) => (
          <SectionContent key={field.id}>
            <LausuntoPyynnonTaydennysForm index={index} projekti={projekti} kunta={field.kunta} />
          </SectionContent>
        ))}
        <Section marginBottom={10}>
          <H2>Lausuntopyynnon täydennyksen mallipohja</H2>
          <p>
            Alla löydät linkin viimeisimpään lausuntopyynnön täydennyksen mallipohjaan. Lataa lausuntopyynnön täydennyksen mallipohja
            tietokoneellesi ja täytä sen sisältö. Lausuntopyynnön täydennys lähetetään järjestelmän ulkopuolella.
          </p>
          <div>
            {projekti.velho.tyyppi !== ProjektiTyyppi.RATA && (
              <DownloadButtonLink
                id="mallipohja-33T"
                href="https://extranet.vayla.fi/share/proxy/alfresco/slingshot/node/content/workspace/SpacesStore/4eed335c-f10c-4d3d-90f6-420edc0fd94d/851_33T%20Lausuntopyynn%c3%b6n%20t%c3%a4ydent%c3%a4minen%20kunnalle.dotx?a=true"
              >
                Mallipohja kunnalle 33T
              </DownloadButtonLink>
            )}
            {projekti.velho.tyyppi !== ProjektiTyyppi.TIE && (
              <DownloadButtonLink
                id="mallipohja-33R"
                href="https://extranet.vayla.fi/share/proxy/alfresco/slingshot/node/content/workspace/SpacesStore/4220e2fa-e681-483c-b3a2-a779af0f1254/33R%20Lausuntopyynn%c3%b6n%20t%c3%a4ydent%c3%a4minen%20kunnalle%20xx%20xxS.docx?a=true"
              >
                Mallipohja kunnalle 33R
              </DownloadButtonLink>
            )}
          </div>
        </Section>
        <LausuntoPyynnonTaydennysPainikkeet projekti={projekti} />
      </FormProvider>
    </LausuntopyynnotPageLayout>
  );
};
