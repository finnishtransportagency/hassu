import React from "react";
import { api, Projekti } from "@services/api";
import log from "loglevel";
import Link from "next/link";

type ProjektiListausState = {
  projektit: Projekti[];
};

type ProjektiListausProps = {
  admin?: boolean;
};

export class ProjektiListaus extends React.Component<ProjektiListausProps, ProjektiListausState> {
  constructor(props: ProjektiListausProps) {
    super(props);
    this.state = { projektit: [] };
  }

  async fetchProjektit() {
    try {
      const result = await api.listProjektit();
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
      return [];
    }
  }

  async componentDidMount() {
    const projektit = await this.fetchProjektit();
    this.setState({
      projektit,
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
          {this.state.projektit.map((projekti) => (
            <tr key={projekti.oid}>
              <td>
                <Link
                  href={
                    (this.props.admin ? "/yllapito/projekti" : "/suunnitelma") + `/${encodeURIComponent(projekti.oid)}`
                  }
                >
                  <a>{projekti.velho?.nimi}</a>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}
