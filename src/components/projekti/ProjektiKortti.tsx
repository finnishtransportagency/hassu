import { Projekti } from "@services/api";
import React, { ReactElement } from "react";
import { Typography } from "@mui/material";
import ExtLink from "@components/ExtLink";
import getAsiatunnus from "src/util/getAsiatunnus";

interface Props {
  projekti: Projekti;
}

export default function ProjektiKortti(props: Props): ReactElement {
  const julkinenURL = window.location.protocol + "//" + window.location.host + "/suunnitelma/" + props.projekti.oid;
  const asiatunnus = getAsiatunnus(props.projekti) || "-/0000/00.00.00/0000";
  const nimi = props.projekti.velho.nimi;

  return (
    <div role="navigation" className="bg-gray-lightest" style={{ marginBottom: "1em", paddingTop: "1.2em", paddingBottom: "1.2em" }}>
      <div className="flex">
        <img
          style={{ display: "inline", alignSelf: "start", marginLeft: "1rem", marginRight: "1rem" }}
          src="/assets/projektikortin-ikoni.svg"
          alt="maapallo"
        />
        {nimi}
      </div>
      <div style={{ marginLeft: "3.5rem", marginRight: "1rem" }}>
        <Typography style={{ paddingTop: "0.7em", paddingBottom: "0.7em" }}>{asiatunnus}</Typography>
        {props.projekti.julkinenStatus && <ExtLink href={julkinenURL}>Siirry kansalaisnäkymään</ExtLink>}
      </div>
    </div>
  );
}
