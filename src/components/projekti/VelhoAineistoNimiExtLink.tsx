import { api } from "@services/api";
import ExtLink from "@components/ExtLink";
import log from "loglevel";
import { useProjekti } from "src/hooks/useProjekti";

interface Props {
  addTopMargin?: boolean;
  aineistoOid: string;
  aineistoNimi: string;
}

const VelhoAineistoNimiExtLink = ({ aineistoNimi, aineistoOid, addTopMargin }: Props) => {
  const { data: projekti } = useProjekti();
  return (
    <ExtLink
      as="button"
      type="button"
      sx={addTopMargin ? { marginTop: 4 } : undefined}
      onClick={async () => {
        if (projekti?.oid) {
          try {
            const link = await api.haeVelhoProjektiAineistoLinkki(projekti?.oid, aineistoOid);
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
};

export default VelhoAineistoNimiExtLink;
