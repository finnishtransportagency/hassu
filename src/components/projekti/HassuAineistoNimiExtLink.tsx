import ExtLink from "@components/ExtLink";
import { FILE_PATH_DELETED_PREFIX } from "../../../common/links";
import { AineistoTila } from "../../../common/graphql/apiModel";

interface Props {
  addTopMargin?: boolean;
  tiedostoPolku?: string | null;
  aineistoNimi: string;
  aineistoTila?: AineistoTila | null;
}

const HassuAineistoNimiExtLink = ({
  aineistoNimi,
  tiedostoPolku,
  addTopMargin,
  aineistoTila,
  ...extlinkProps
}: Props & Omit<React.ComponentProps<typeof ExtLink>, "children">) => {
  let href = tiedostoPolku || undefined;

  const isDeleted = !!href && href.startsWith(FILE_PATH_DELETED_PREFIX);
  href = isDeleted ? undefined : href;

  return (
    <ExtLink
      className="file_download"
      sx={addTopMargin ? { marginTop: 4 } : undefined}
      href={href}
      target="_blank"
      disabled={!href || aineistoTila == AineistoTila.POISTETTU}
      hideIcon={!href}
      {...extlinkProps}
    >
      {aineistoNimi}
    </ExtLink>
  );
};

export default HassuAineistoNimiExtLink;
