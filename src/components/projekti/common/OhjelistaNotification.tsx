import React, { ReactNode, FunctionComponent } from "react";
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
  NAHTAVILLAOLO: "Valmiin suunnitelman nähtävillä olo ja lausuntojen pyytäminen",
  HYVAKSYMISPAATOS: "Kuulutus päätöksen nähtäville asettamisesta",
  JATKOPAATOS: "Suunnitelman voimassaolon jatkaminen",
  JATKOPAATOS2: "Suunnitelman voimassaolon jatkaminen",
};

const AshaKuulutusToimenpideTeksti: FunctionComponent<{ vaihe: Vaihe }> = ({ vaihe }) => (
  <>
    Ennen {vaihe === Vaihe.SUUNNITTELU ? "kutsun" : "kuulutuksen"} täyttämistä tarkista, että asialla on auki asianhallintajärjestelmässä
    oikea toimenpide, joka on nimeltään {vaiheenVelhoToimeenpide[vaihe]}. {vaihe === Vaihe.SUUNNITTELU ? "Kutsun" : "Kuulutuksen"} julkaisu
    ei ole mahdollista, jos asianhallintajärjestelmässä on väärä toimenpide auki. <KatsoTarkemmatASHAOhjeetLink />
  </>
);

export const OhjelistaNotification: FunctionComponent<Props> = ({ children, asianhallintaTiedot, open, onClose }) => {
  const { data: nykyinenKayttaja } = useCurrentUser();

  const vaylaAsianhallinta = asianhallintaTiedot?.projekti && isVaylaAsianhallinta(asianhallintaTiedot.projekti);

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
        </ul>
      </div>
    </Notification>
  );
};
