import { HyvaksymisEsityksenTiedot, HyvaksymisTila, Vaihe } from "@services/api";
import HyvaksyTaiPalautaPainikkeet from "./LomakeComponents/HyvaksyTaiPalautaPainikkeet";
import useKayttoOikeudet from "src/hooks/useKayttoOikeudet";
import Section from "@components/layout/Section2";
import Notification, { NotificationType } from "@components/notification/Notification";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import useApi from "src/hooks/useApi";
import Button from "@components/button/Button";

export default function HyvaksymisEsitysLukutila({ hyvaksymisEsityksenTiedot }: { hyvaksymisEsityksenTiedot: HyvaksymisEsityksenTiedot }) {
  const { oid, versio, hyvaksymisEsitys, muokkauksenVoiAvata } = hyvaksymisEsityksenTiedot;
  const odottaaHyvaksyntaa = hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.tila == HyvaksymisTila.ODOTTAA_HYVAKSYNTAA;
  const { data: nykyinenKayttaja } = useKayttoOikeudet();
  const api = useApi();

  if (!hyvaksymisEsitys) {
    return null;
  }
  return (
    <ProjektiPageLayout
      title="Hyväksymisesitys"
      vaihe={Vaihe.HYVAKSYMISPAATOS}
      contentAsideTitle={
        muokkauksenVoiAvata ? (
          <Button onClick={() => api.avaaHyvaksymisEsityksenMuokkaus({ oid, versio })} id="avaa_hyvaksymisesityksen_muokkaus_button">
            Muokkaa
          </Button>
        ) : (
          <></>
        )
      }
    >
      {odottaaHyvaksyntaa && nykyinenKayttaja?.onProjektipaallikkoTaiVarahenkilo && (
        <Section noDivider>
          <Notification type={NotificationType.WARN}>
            Hyväksymisesitys odottaa hyväksyntää. Tarkista hyväksymisesitys ja a) hyväksy tai b) palauta hyväksymisesitys korjattavaksi, jos
            havaitset puutteita tai virheen.
          </Notification>
        </Section>
      )}
      {odottaaHyvaksyntaa && nykyinenKayttaja?.omaaMuokkausOikeuden && !nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo && (
        <Section noDivider>
          <Notification type={NotificationType.WARN}>
            Hyväksymisesitys on hyväksyttävänä projektipäälliköllä. Jos hyväksymisesitystä tarvitsee muokata, ota yhteysprojektipäällikköön.
          </Notification>
        </Section>
      )}
      {JSON.stringify(hyvaksymisEsityksenTiedot)}
      {odottaaHyvaksyntaa && nykyinenKayttaja?.onProjektipaallikkoTaiVarahenkilo && (
        <HyvaksyTaiPalautaPainikkeet oid={oid} versio={versio} vastaanottajat={hyvaksymisEsitys.vastaanottajat!} />
      )}
    </ProjektiPageLayout>
  );
}
