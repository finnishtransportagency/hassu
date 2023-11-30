import ExtLink from "@components/ExtLink";
import { LadattavaTiedosto } from "@services/api";

export function renderLadattavaTiedosto(tiedosto: LadattavaTiedosto, props?: { esikatselu: boolean }) {
  const fileNameSplit = tiedosto.nimi.split(".");
  const fileType: string = fileNameSplit[fileNameSplit?.length - 1];
  if (!tiedosto.linkki || props?.esikatselu) {
    return (
      <>
        {tiedosto.nimi} ({fileType}) {!tiedosto.linkki && "(ODOTTAA TUONTIA)"}
      </>
    );
  } else {
    return (
      <ExtLink className="file_download" href={tiedosto.linkki} sx={{ mr: 3 }}>
        {tiedosto.nimi} <span className="text-black ml-2">({fileType})</span>
      </ExtLink>
    );
  }
}
