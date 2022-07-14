import ExtLink from "@components/ExtLink";
import { useProjekti } from "src/hooks/useProjekti";
interface Props {
  addTopMargin?: boolean;
  tiedostoPolku?: string | null;
  aineistoNimi: string;
}

const HassuAineistoNimiExtLink = ({
  aineistoNimi,
  tiedostoPolku,
  addTopMargin,
  ...extlinkProps
}: Props & Omit<React.ComponentProps<typeof ExtLink>, "children">) => {
  const { data: projekti } = useProjekti();
  const href = tiedostoPolku && projekti ? `/yllapito/tiedostot/projekti/${projekti.oid}/${tiedostoPolku}` : undefined;
  return (
    <ExtLink
      sx={addTopMargin ? { marginTop: 4 } : undefined}
      href={href}
      target="_blank"
      disabled={!href}
      hideIcon={!href}
      {...extlinkProps}
    >
      {aineistoNimi}
    </ExtLink>
  );
};

export default HassuAineistoNimiExtLink;
