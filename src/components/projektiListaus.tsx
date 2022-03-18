import React from "react";
import { api, ProjektiHakutulos, ProjektiTyyppi } from "@services/api";
import log from "loglevel";
import Link from "next/link";

type ProjektiListausState = {
  hakutulos: ProjektiHakutulos;
};

type ProjektiListausProps = {
  admin?: boolean;
  projektiTyyppi: ProjektiTyyppi;
};

export class ProjektiListaus extends React.Component<ProjektiListausProps, ProjektiListausState> {
  constructor(props: ProjektiListausProps) {
    super(props);
    this.state = { hakutulos: { __typename: "ProjektiHakutulos" } };
  }

  async fetchProjektit(): Promise<ProjektiHakutulos> {
    try {
      const result = await api.listProjektit({ projektiTyyppi: this.props.projektiTyyppi });
      log.info("listProjektit:", result);
      return result;
    } catch (e: any) {
      log.error("Error listing projektit", e);
      if (e.errors) {
        e.errors.map((err: any) => {
          const response = err.originalError?.response;
          const httpStatus = response?.status;
          log.error("HTTP Status: " + httpStatus + "\n" + err.stack);
        });
      }
      return { __typename: "ProjektiHakutulos" };
    }
  }

  async componentDidMount() {
    const hakutulos = await this.fetchProjektit();
    this.setState({
      hakutulos,
    });
  }

  render() {
    return (
      <table>
        <thead>
          <tr>
            <th className="text-left">Nimi</th>
          </tr>
        </thead>
        <tbody>
          {this.state.hakutulos.tulokset?.map((projekti) => (
            <tr key={projekti.oid}>
              <td>
                <Link
                  href={
                    (this.props.admin ? "/yllapito/projekti" : "/suunnitelma") + `/${encodeURIComponent(projekti.oid)}`
                  }
                >
                  <a>{projekti.nimi}</a>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}
