import React, { ReactNode, VFC } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import { H3 } from "@components/Headings";
import { Vaihe } from "@services/api";
import { KatsoTarkemmatASHAOhjeetLink } from "./KatsoTarkemmatASHAOhjeetLink";
import useCurrentUser from "src/hooks/useCurrentUser";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { isVaylaAsianhallinta } from "common/isVaylaAsianhallinta";

type AsianhallintaTiedot = {
  vaihe: Vaihe;
  projekti: ProjektiLisatiedolla;
};

type Props = { children: ReactNode; asianhallintaTiedot?: AsianhallintaTiedot; open?: boolean; onClose?: () => void };

const vaiheenVelhoToimeenpide: Record<Vaihe, string> = {
  ALOITUSKUULUTUS: "Kuuluttaminen  suunnittelun ja maastotöiden aloittamisesta",
  SUUNNITTELU: "Suunnittelun aikainen vuorovaikutus",
  NAHTAVILLAOLO: "Valmiin suunnittelman nähtävillä olo ja lausuntojen pyytäminen",
  HYVAKSYMISPAATOS: "Kuulutus päätöksen nähtäville asettamisesta",
  JATKOPAATOS: "Kuulutus suunnitelman voimassaolon jatkamisesta",
  JATKOPAATOS2: "Kuulutus suunnitelman voimassaolon jatkamisesta",
};

const UspaKuulutusToimenpideTeksti: VFC<{ vaihe: Vaihe; enabled: boolean }> = ({ vaihe, enabled }) => {
  if (!enabled) {
    return (
      <>
        Vie lopuksi sähköpostilla saamasi {vaihe === Vaihe.SUUNNITTELU ? "kutsu ja lähetekirje" : "kuulutus ja ilmoitus"} asianhallintaan.
      </>
    );
  }
  return (
    <>
      {vaihe === Vaihe.SUUNNITTELU ? "Kutsu ja lähetekirje" : "Kuulutus ja ilmoitus kuulutuksesta"} siirtyvät automaattisesti
      asianhallintaan integraatioyhteyden ollessa päällä.
    </>
  );
};

const AshaKuulutusToimenpideTeksti: VFC<{ vaihe: Vaihe }> = ({ vaihe }) => (
  <>
    Ennen {vaihe === Vaihe.SUUNNITTELU ? "kutsun" : "kuulutuksen"} täyttämistä tarkista, että asialla on auki asianhallintajärjestelmässä
    oikea toimenpide, joka on nimeltään {vaiheenVelhoToimeenpide[vaihe]}. {vaihe === Vaihe.SUUNNITTELU ? "Kutsun" : "Kuulutuksen"} julkaisu
    ei ole mahdollista, jos asianhallintajärjestelmässä on väärä toimenpide auki. <KatsoTarkemmatASHAOhjeetLink />
  </>
);

export const OhjelistaNotification: VFC<Props> = ({ children, asianhallintaTiedot, open, onClose }) => {
  const { data: nykyinenKayttaja } = useCurrentUser();

  const vaylaAsianhallinta = asianhallintaTiedot?.projekti && isVaylaAsianhallinta(asianhallintaTiedot.projekti);
  const elyAsianhallinta = asianhallintaTiedot?.projekti && !isVaylaAsianhallinta(asianhallintaTiedot.projekti);

  return (
    <Notification closable type={NotificationType.INFO} hideIcon open={open} onClose={onClose}>
      <div>
        <H3 variant="h4">Ohjeet</H3>
        <ul className="list-disc block pl-5">
          {vaylaAsianhallinta && nykyinenKayttaja?.features?.asianhallintaIntegraatio && (
            <li>
              <AshaKuulutusToimenpideTeksti vaihe={asianhallintaTiedot.vaihe} />
            </li>
          )}
          {children}
          {elyAsianhallinta && nykyinenKayttaja?.features?.asianhallintaIntegraatio && (
            <li>
              <UspaKuulutusToimenpideTeksti vaihe={asianhallintaTiedot.vaihe} enabled={nykyinenKayttaja.features.uspaIntegraatio} />
            </li>
          )}
        </ul>
      </div>
    </Notification>
  );
};
