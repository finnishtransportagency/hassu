import { api } from "@services/api";
import ExtLink from "@components/ExtLink";
import log from "loglevel";

interface AineistoNimiExtLinkProps {
  projektiOid: string;
  addTopMargin?: boolean;
  aineistoOid: string;
  aineistoNimi: string;
}

const AineistoNimiExtLink = ({ aineistoNimi, aineistoOid, projektiOid, addTopMargin }: AineistoNimiExtLinkProps) => (
  <ExtLink
    as="button"
    type="button"
    sx={addTopMargin ? { marginTop: 4 } : undefined}
    onClick={async () => {
      if (projektiOid) {
        try {
          const link = await api.haeVelhoProjektiAineistoLinkki(projektiOid, aineistoOid);
          const anchor = document.createElement("a");
          anchor.href = link;
          anchor.download = aineistoNimi;
          anchor.click();
        } catch (e) {
          log.error("Error gathering aineistolinkki", e);
        }
      }
    }}
  >
    {aineistoNimi}
  </ExtLink>
);

export default AineistoNimiExtLink;
