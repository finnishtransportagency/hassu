import { HyvaksymisEsityksenTiedot, TallennaHyvaksymisEsitysInput, Vaihe } from "@services/api";
import { useEffect, useMemo } from "react";
import { FormProvider, UseFormProps, useForm } from "react-hook-form";
import getDefaultValuesForForm from "./getDefaultValuesForForm";
import Section from "@components/layout/Section2";
import LinkinVoimassaoloaika from "./LomakeComponents/LinkinVoimassaoloaika";
import ViestiVastaanottajalle from "./LomakeComponents/ViestiVastaanottajalle";
import Laskutustiedot from "./LomakeComponents/Laskutustiedot";
import LinkkiHyvEsAineistoon from "./LomakeComponents/LinkkiHyvEsAineistoon";
import HyvaksymisEsitysTiedosto from "./LomakeComponents/HyvaksymisEsitysTiedosto";
import Muistutukset from "./LomakeComponents/Muistutukset";
import Vastaanottajat from "./LomakeComponents/Vastaanottajat";
import MuuAineistoKoneelta from "./LomakeComponents/MuuAineistoKoneelta";
import MuuAineistoVelhosta from "./LomakeComponents/MuuAineistoVelhosta";
import Lausunnot from "./LomakeComponents/Lausunnot";
import Maanomistajaluettelo from "./LomakeComponents/MaanomistajaLuettelo";
import KuulutuksetJaKutsu from "./LomakeComponents/KuulutuksetJaKutsu";
import Notification, { NotificationType } from "@components/notification/Notification";
import AineistonEsikatselu from "./LomakeComponents/AineistonEsikatselu";
import ProjektiPageLayout, { ProjektiPageLayoutContext } from "@components/projekti/ProjektiPageLayout";
import { OhjelistaNotification } from "@components/projekti/common/OhjelistaNotification";
import { H3, H4 } from "@components/Headings";
import ExtLink from "@components/ExtLink";
import { formatDate } from "common/util/dateUtils";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { yupResolver } from "@hookform/resolvers/yup";
import { hyvaksymisEsitysSchema, HyvaksymisEsitysValidationContext, TestType } from "hassu-common/schema/hyvaksymisEsitysSchema";
import Suunnitelma from "./LomakeComponents/Suunnitelma";
import MuokkausLomakePainikkeet from "./LomakeComponents/MuokkausLomakePainikkeet";
import useValidationMode from "src/hooks/useValidationMode";

type Props = {
  hyvaksymisEsityksenTiedot: HyvaksymisEsityksenTiedot;
};

export default function HyvaksymisEsitysLomake({ hyvaksymisEsityksenTiedot }: Readonly<Props>) {
  const defaultValues: TallennaHyvaksymisEsitysInput = useMemo(
    () => getDefaultValuesForForm(hyvaksymisEsityksenTiedot),
    [hyvaksymisEsityksenTiedot]
  );

  const validationMode = useValidationMode();

  const formOptions: UseFormProps<TallennaHyvaksymisEsitysInput, HyvaksymisEsitysValidationContext> = {
    resolver: yupResolver(hyvaksymisEsitysSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    context: { validationMode, testType: TestType.FRONTEND },
  };

  const useFormReturn = useForm<TallennaHyvaksymisEsitysInput, HyvaksymisEsitysValidationContext>(formOptions);

  useEffect(() => {
    useFormReturn.reset(defaultValues);
  }, [useFormReturn, defaultValues]);

  if (!hyvaksymisEsityksenTiedot) {
    return null;
  }

  const url = `${window?.location?.protocol}//${window?.location?.host}/suunnitelma/${hyvaksymisEsityksenTiedot.oid}/hyvaksymisesitysaineistot?hash=${hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.hash}`;

  return (
    <ProjektiPageLayout title="Hyväksymisesitys" vaihe={Vaihe.HYVAKSYMISPAATOS} showInfo>
      {hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.hyvaksymisPaiva && (
        <Section noDivider>
          <Notification type={NotificationType.INFO_GREEN}>
            Hyväksymisesitys on lähetetty vastaanottajalle {formatDate(hyvaksymisEsityksenTiedot.hyvaksymisEsitys.hyvaksymisPaiva)}:{" "}
            <ExtLink href={url}>{url}</ExtLink>
          </Notification>
        </Section>
      )}
      <ProjektiPageLayoutContext.Consumer>
        {({ ohjeetOnClose, ohjeetOpen }) => (
          <FormProvider {...useFormReturn}>
            <form>
              <Section>
                <OhjelistaNotification onClose={ohjeetOnClose} open={ohjeetOpen}>
                  <li>
                    Tällä sivulla luodaan hyväksymisesityksenä lähetettävän suunnitelman aineiston sisältö ja määritellään sen
                    vastaanottajat. Järjestelmä luo ja lähettää vastaanottajille automaattisesti sähköpostiviestin, jonka linkistä pääsee
                    tarkastelemaan ja lataamaan hyväksymisesityksen sisällön.
                  </li>
                  <li>
                    Anna hyväksymisesitykseen toimitettavalle suunnitelmalle voimassaoloaika. Voimassaoloaika tarkoittaa sitä, että
                    vastaanottajan on mahdollista tarkastella toimitettavan linkin sisältöä kyseiseen päivämäärään saakka. Linkin
                    voimassaoloaikaa on mahdollista muuttaa jälkikäteen.
                  </li>
                  <li>Hyväksymisesityksen kiireellistä käsittelyä voi pyytää raksittamalla ”Pyydetään kiireellistä käsittelyä”.</li>
                  <li>Halutessasi voit kirjata lisätietoa hyväksymisesityksestä vastaanottajalle.</li>
                  <li>
                    Tuo omalta koneelta allekirjoitettu hyväksymisesitys. Sisällytä Hyväksymisesitys-tiedostoon linkki hyväksymisesityksen
                    aineistosta.
                  </li>
                  <li>
                    Tuo suunnitelma Projektivelhosta ja vuorovaikutusaineistot omalta koneelta. Järjestelmä listaa automaattisesti
                    kuulutukset ja kutsun vuorovaikutukseen sekä maanomistajaluettelon hyväksymisesitykseen. Voit haluessasi tuoda myös
                    muuta aineistoa.
                  </li>
                  <li>Lisää hyväksymisesitykselle vastaanottajat.</li>
                  <li>
                    Esikatsele hyväksymisesityksen sisältä ennen sen lähettämistä projektipäällikön hyväksyttäväksi. Projektipäällikön
                    hyväksyntä lähettää hyväksymisesityksen automaattisesti sen vastaanottajille.
                  </li>
                  <li>Hyväksymisesityksen sisältöä on mahdollista päivittää jälkikäteen.</li>
                </OhjelistaNotification>
                {hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.palautusSyy && (
                  <Notification type={NotificationType.WARN}>
                    {"Hyväksymisesitys on palautettu korjattavaksi. Palautuksen syy: " +
                      hyvaksymisEsityksenTiedot.hyvaksymisEsitys.palautusSyy}
                  </Notification>
                )}
                <H3 variant="h2">Hyväksymisesityksen sisältö</H3>
                <LinkinVoimassaoloaika />
              </Section>
              <Section>
                <ViestiVastaanottajalle />
                <Laskutustiedot perustiedot={hyvaksymisEsityksenTiedot.perustiedot} />
              </Section>
              <Section>
                <H3 variant="h2">Hyväksymisesitykseen liitettävä aineisto</H3>
                <LinkkiHyvEsAineistoon hash={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.hash} oid={hyvaksymisEsityksenTiedot.oid} />
                <HyvaksymisEsitysTiedosto />
                <Suunnitelma />
                <H4 variant="h3">Vuorovaikutus</H4>
                <p>Tuo omalta koneelta suunnitelmalle annetut muistutukset, lausunnot ja maanomistajaluettelo.</p>
                <Muistutukset kunnat={hyvaksymisEsityksenTiedot.perustiedot.kunnat} />
                <Lausunnot />
                <Maanomistajaluettelo tuodut={hyvaksymisEsityksenTiedot.tuodutTiedostot.maanomistajaluettelo} />
                <KuulutuksetJaKutsu tuodut={hyvaksymisEsityksenTiedot.tuodutTiedostot.kuulutuksetJaKutsu} />
                <H4 variant="h3">Muu tekninen aineisto</H4>
                <p>
                  Voit halutessasi liittää hyväksymisesitykseen muuta täydentävää teknistä aineistoa Projektivelhosta tai omalta koneelta.
                </p>
                <MuuAineistoVelhosta />
                <MuuAineistoKoneelta />
              </Section>
              <Section>
                <Vastaanottajat />
              </Section>
              <Section>
                <AineistonEsikatselu />
              </Section>
              <MuokkausLomakePainikkeet hyvaksymisesitys={hyvaksymisEsityksenTiedot} />
            </form>
          </FormProvider>
        )}
      </ProjektiPageLayoutContext.Consumer>
    </ProjektiPageLayout>
  );
}
