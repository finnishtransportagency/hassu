import ExtLink from "@components/ExtLink";
import { LadattavaTiedosto } from "@services/api";
import { formatDate } from "common/util/dateUtils";

export default function LadattavaTiedostoComponent({ tiedosto, esikatselu }: { tiedosto: LadattavaTiedosto; esikatselu?: boolean }) {
  const fileNameSplit = tiedosto.nimi.split(".");
  const fileType: string = fileNameSplit[fileNameSplit?.length - 1];
  const tuotu = tiedosto.tuotu ? formatDate(tiedosto.tuotu) : "";
  if (!tiedosto.linkki || esikatselu) {
    return (
      <>
        {tiedosto.nimi} ({fileType} {tuotu}) {!tiedosto.linkki && "(ODOTTAA TUONTIA)"}
      </>
    );
  } else {
    return (
      <ExtLink className="file_download" href={tiedosto.linkki} sx={{ mr: 3 }}>
        {tiedosto.nimi}{" "}
        <span className="text-black ml-2">
          ({fileType} {tuotu})
        </span>
      </ExtLink>
    );
  }
}
