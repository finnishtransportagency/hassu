import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import Notification, { NotificationType } from "@components/notification/Notification";
import { HyvaksymisPaatosVaihe, KuulutusJulkaisuTila, MuokkausTila, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "@services/api";
import { EdellinenVaiheMigroituNotification } from "./EdellinenVaiheMigroituNotification";
import FormatDate from "@components/FormatDate";
import dayjs from "dayjs";

export const KuulutusInfoElement = ({
  projekti,
  julkaisu,
  edellinenVaiheMigroitu,
  vaihe,
}: {
  projekti: ProjektiLisatiedolla;
  julkaisu: Pick<
    NahtavillaoloVaiheJulkaisu,
    "tila" | "kuulutusPaiva" | "kuulutusVaihePaattyyPaiva" | "uudelleenKuulutus" | "aineistoMuokkaus"
  >;
  edellinenVaiheMigroitu: boolean;
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined;
}) => {
  const isAineistoMuokkaus = vaihe?.muokkausTila === MuokkausTila.AINEISTO_MUOKKAUS;

  if (julkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA) {
    if (projekti?.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo || projekti?.nykyinenKayttaja.onYllapitaja) {
      return (
        <Notification type={NotificationType.WARN}>
          {julkaisu.aineistoMuokkaus
            ? "Aineistoihin on tehty muokkauksia ja ne odottavat hyväksyntää. Uudet aineistot merkitty tunnisteella UUSI. Tarkasta aineisto ja a) hyväksy tai b) palauta aineisto korjattavaksi, jos havaitset puutteita tai virheen. Huomaathan, että aineistot on hyväksyttävä ennen kuulutuspäivää."
            : "Kuulutus odottaa hyväksyntää. Tarkasta kuulutus ja a) hyväksy tai b) palauta kuulutus korjattavaksi, jos havaitset puutteita tai virheen."}
        </Notification>
      );
    } else {
      return (
        <Notification type={NotificationType.WARN}>
          {julkaisu.aineistoMuokkaus
            ? "Aineistojen muokkaus odottaa projektipäällikön hyväksyntää. Jos aineistoja tai kuulutusta tarvitsee muokata, ota yhteys projektipäällikköön."
            : "Kuulutus on hyväksyttävänä projektipäälliköllä. Jos kuulutusta tarvitsee muokata, ota yhteys projektipäällikköön."}
        </Notification>
      );
    }
  } else if (!!vaihe?.palautusSyy) {
    return (
      <Notification type={NotificationType.WARN}>
        {"Kuulutus on palautettu korjattavaksi. Palautuksen syy: " + vaihe.palautusSyy}
      </Notification>
    );
  } else if (julkaisu?.tila === KuulutusJulkaisuTila.HYVAKSYTTY) {
    // Toistaiseksi tarkastellaan julkaisupaivatietoa, koska ei ole olemassa erillista tilaa julkaistulle kuulutukselle
    const julkaisupvm = dayjs(julkaisu.kuulutusPaiva);
    if (dayjs().isBefore(julkaisupvm, "day")) {
      return (
        <Notification type={NotificationType.WARN}>
          {`Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä ${julkaisupvm.format("DD.MM.YYYY")}.`}
          {isAineistoMuokkaus && ` Olet muokkaamassa suunnitelman aineistoja. Lähetä muokattu aineisto projektipäällikön hyväksyttäväksi.`}
        </Notification>
      );
    } else {
      return (
        <Notification type={NotificationType.INFO_GREEN}>
          Kuulutus on julkaistu {julkaisupvm.format("DD.MM.YYYY")}. Projekti näytetään kuulutuspäivästä lasketun määräajan jälkeen palvelun
          julkisella puolella suunnittelussa olevana. Kuulutusvaihe päättyy <FormatDate date={julkaisu.kuulutusVaihePaattyyPaiva} />
        </Notification>
      );
    }
  } else if (edellinenVaiheMigroitu) {
    return <EdellinenVaiheMigroituNotification oid={projekti?.oid} />;
  } else {
    return <></>;
  }
};
