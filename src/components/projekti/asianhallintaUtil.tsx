import { SynkronointiTila } from "@hassu/asianhallinta";
import React from "react";

export function naytaIntegroinninTila(synkronointiTila?: string | null) {
  if (!synkronointiTila) {
    return <></>;
  }

  let tila;
  switch (synkronointiTila as SynkronointiTila) {
    case "ASIAA_EI_LOYDY":
      tila = "Asiaa ei löydy";
      break;
    case "ASIANHALLINTA_VAARASSA_TILASSA":
      tila = "Asianhallinta on väärässä tilassa";
      break;
    case "VIRHE":
      tila = "Synkronoinnissa tapahtui virhe";
      break;
    case "SYNKRONOITU":
      tila = "Synkronoitu";
      break;
  }

  return <p>Integroinnin tila: {tila}</p>;
}
