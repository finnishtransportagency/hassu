import { HyvaksymisEsityksenTiedot, HyvaksymisTila, SuunnittelustaVastaavaViranomainen } from "@services/api";
import { useEffect, useMemo } from "react";
import { FormProvider, UseFormProps, useForm } from "react-hook-form";
import { HyvaksymisEsitysForm, getDefaultValuesForForm } from "./hyvaksymisEsitysFormUtil";
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
import { yupResolver } from "@hookform/resolvers/yup";
import { hyvaksymisEsitysSchema, HyvaksymisEsitysValidationContext } from "hassu-common/schema/hyvaksymisEsitysSchema";
import Suunnitelma from "./LomakeComponents/Suunnitelma";
import MuokkausLomakePainikkeet from "./LomakeComponents/MuokkausLomakePainikkeet";
import useValidationMode from "src/hooks/useValidationMode";
import { TestType } from "common/schema/common";
import { getAineistoKategoriat } from "common/aineistoKategoriat";
import { KatsoTarkemmatASHAOhjeetLink } from "@components/projekti/common/KatsoTarkemmatASHAOhjeetLink";
import useCurrentUser from "src/hooks/useCurrentUser";
import AsianhallintaStatusNotification from "./LomakeComponents/AsianhallintaStatusNotification";

type Props = {
  hyvaksymisEsityksenTiedot: HyvaksymisEsityksenTiedot;
};

export default function HyvaksymisEsitysLomake({ hyvaksymisEsityksenTiedot }: Readonly<Props>) {
  const defaultValues: HyvaksymisEsitysForm = useMemo(
    () => getDefaultValuesForForm(hyvaksymisEsityksenTiedot),
    [hyvaksymisEsityksenTiedot]
  );
  const { data: nykyinenKayttaja } = useCurrentUser();

  const validationMode = useValidationMode();

  const formOptions: UseFormProps<HyvaksymisEsitysForm, HyvaksymisEsitysValidationContext> = {
    resolver: yupResolver(hyvaksymisEsitysSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    context: { validationMode, testType: TestType.FRONTEND },
  };

  const useFormReturn = useForm<HyvaksymisEsitysForm, HyvaksymisEsitysValidationContext>(formOptions);

  useEffect(() => {
    useFormReturn.reset(defaultValues);
  }, [useFormReturn, defaultValues]);

  const aineistoKategoriat = useMemo(
    () =>
      getAineistoKategoriat({
        projektiTyyppi: hyvaksymisEsityksenTiedot.perustiedot.projektiTyyppi,
        showKategorisoimattomat: true,
        hideDeprecated: true,
      }),
    [hyvaksymisEsityksenTiedot.perustiedot.projektiTyyppi]
  );

  if (!hyvaksymisEsityksenTiedot) {
    return null;
  }

  const url = `${window?.location?.protocol}//${window?.location?.host}/suunnitelma/${hyvaksymisEsityksenTiedot.oid}/hyvaksymisesitysaineistot?hash=${hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.hash}`;

  return (
    <ProjektiPageLayout title="Hyväksymisesitys" showInfo>
      <AsianhallintaStatusNotification
        asianhallinta={hyvaksymisEsityksenTiedot.asianhallinta}
        ashaTila={hyvaksymisEsityksenTiedot.ashaTila}
        sivunVaiheOnAktiivinen={hyvaksymisEsityksenTiedot.vaiheOnAktiivinen}
        vaiheOnMuokkaustilassa={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.tila == HyvaksymisTila.MUOKKAUS}
        kayttoOikeudet={hyvaksymisEsityksenTiedot.kayttoOikeudet}
        suunnittelustaVastaavaViranomainen={hyvaksymisEsityksenTiedot.perustiedot.vastuuorganisaatio}
      />
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
                  {hyvaksymisEsityksenTiedot.perustiedot.vastuuorganisaatio == SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO &&
                    nykyinenKayttaja?.features?.asianhallintaIntegraatio && (
                      <li>
                        Ennen Hyväksymisesityksen täyttämistä tarkista, että asialla on auki asianhallintajärjestelmässä oikea toimenpide,
                        joka on nimeltään Hyväksymisesityksen lähettäminen Traficomiin. Hyväksymisesityksen lähettäminen ei ole mahdollista,
                        jos asianhallintajärjestelmässä on väärä toimenpide auki. <KatsoTarkemmatASHAOhjeetLink />
                      </li>
                    )}
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
                <HyvaksymisEsitysTiedosto tiedostot={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.hyvaksymisEsitys} />
                <Suunnitelma aineistoKategoriat={aineistoKategoriat} />
                <H4 variant="h3">Vuorovaikutus</H4>
                <p>Tuo omalta koneelta suunnitelmalle annetut muistutukset, lausunnot ja maanomistajaluettelo.</p>
                <Muistutukset
                  kunnat={hyvaksymisEsityksenTiedot.perustiedot.kunnat}
                  tiedostot={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.muistutukset}
                />
                <Lausunnot tiedostot={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.lausunnot} />
                <Maanomistajaluettelo
                  tuodut={hyvaksymisEsityksenTiedot.tuodutTiedostot.maanomistajaluettelo}
                  tiedostot={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.maanomistajaluettelo}
                />
                <KuulutuksetJaKutsu
                  tiedostot={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.kuulutuksetJaKutsu}
                  tuodut={hyvaksymisEsityksenTiedot.tuodutTiedostot.kuulutuksetJaKutsu}
                />
                <H4 variant="h3">Muu tekninen aineisto</H4>
                <p>
                  Voit halutessasi liittää hyväksymisesitykseen muuta täydentävää teknistä aineistoa Projektivelhosta tai omalta koneelta.
                </p>
                <MuuAineistoVelhosta aineisto={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.muuAineistoVelhosta} />
                <MuuAineistoKoneelta tiedostot={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.muuAineistoKoneelta} />
              </Section>
              <Section>
                <Vastaanottajat />
              </Section>
              <Section>
                <AineistonEsikatselu />
              </Section>
              <MuokkausLomakePainikkeet aineistoKategoriat={aineistoKategoriat} hyvaksymisesitys={hyvaksymisEsityksenTiedot} />
            </form>
          </FormProvider>
        )}
      </ProjektiPageLayoutContext.Consumer>
    </ProjektiPageLayout>
  );
}
