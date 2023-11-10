import React, { ReactNode, VFC } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import { H3 } from "@components/Headings";
import { Vaihe } from "@services/api";
import { KatsoTarkemmatASHAOhjeetLink } from "./KatsoTarkemmatASHAOhjeetLink";
import useCurrentUser from "src/hooks/useCurrentUser";

type Props = { children: ReactNode; vaihe?: Vaihe; open?: boolean; onClose?: () => void };

const vaiheenVelhoToimeenpide: Record<Vaihe, string> = {
  ALOITUSKUULUTUS: "Kuuluttaminen suunnittelun ja maastotöiden aloittamisesta",
  SUUNNITTELU: "Suunnittelun aikainen vuorovaikutus",
  NAHTAVILLAOLO: "Valmiin suunnittelman nähtävillä olo ja lausuntojen pyytäminen",
  HYVAKSYMISPAATOS: "Kuulutus päätöksen nähtäville asettamisesta",
  JATKOPAATOS: "Kuulutus suunnitelman voimassaolon jatkamisesta",
  JATKOPAATOS2: "Kuulutus suunnitelman voimassaolon jatkamisesta",
};

const UspaKuulutusToimenpideTeksti: VFC<{ vaihe: Vaihe, enabled: boolean }> = ({ vaihe, enabled }) => {
  if (!enabled) {
    return <>Vie lopuksi sähköpostilla saamasi {vaihe === Vaihe.SUUNNITTELU ? "kutsu ja lähetekirje" : "kuulutus ja ilmoitus"} USPA:an.</>
  }
  if (vaihe === Vaihe.ALOITUSKUULUTUS) {
    return <>Kuulutus, ilmoitus kuulutuksesta ja lähetekirje siirtyvät automaattisesti USPA:an.</>
  } else if (vaihe === Vaihe.SUUNNITTELU) {
    return <>Kutsu ja lähetekirje kutsusta siirtyy automaattisesti USPA:an.</>
  } else {
    return <>Kuulutus ja ilmoitus kuulutuksesta siirtyy automaattisesti USPA:an.</>
  }
};

const AshaKuulutusToimenpideTeksti: VFC<{ vaihe: Vaihe }> = ({ vaihe }) => (
  <>
    Ennen {vaihe === Vaihe.SUUNNITTELU ? "kutsun" : "kuulutuksen"} täyttämistä tarkista, että asialla on auki asianhallintajärjestelmässä
    oikea toimenpide, joka on nimeltään {vaiheenVelhoToimeenpide[vaihe]}. {vaihe === Vaihe.SUUNNITTELU ? "Kutsun" : "Kuulutuksen"} julkaisu
    ei ole mahdollista, jos asianhallintajärjestelmässä on väärä toimenpide auki. <KatsoTarkemmatASHAOhjeetLink />
  </>
);

export const OhjelistaNotification: VFC<Props> = ({ children, vaihe, open, onClose }) => {
  const { data: nykyinenKayttaja } = useCurrentUser();
  return (
    <Notification closable type={NotificationType.INFO} hideIcon open={open} onClose={onClose}>
      <div>
        <H3 variant="h4">Ohjeet</H3>
        <ul className="list-disc block pl-5">
          {vaihe && nykyinenKayttaja?.features?.asianhallintaIntegraatio && (
            <>
              <li>
                <strong>Tämä kohta koskee vain Väylävirastoa:</strong> <AshaKuulutusToimenpideTeksti vaihe={vaihe} />
              </li>
              <li>
                <strong>Tämä kohta koskee ELY-keskusta:</strong> <UspaKuulutusToimenpideTeksti vaihe={vaihe} enabled={nykyinenKayttaja.features.uspaIntegraatio} />
              </li>
            </>
          )}
          {children}
        </ul>
      </div>
    </Notification>
  );
};
