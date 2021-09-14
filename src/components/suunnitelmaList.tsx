import React from "react";
import { Suunnitelma } from "../graphql/apiModel";
import log from "loglevel";
import Link from "next/link";
import { listSuunnitelmat } from "../graphql/api";

type SuunnitelmaListState = {
  suunnitelmat: Suunnitelma[];
};

type SuunnitelmaListProps = {
  admin?: boolean;
};

export class SuunnitelmaList extends React.Component<SuunnitelmaListProps, SuunnitelmaListState> {
  constructor(props: SuunnitelmaListProps) {
    super(props);
    this.state = { suunnitelmat: [] };
  }

  async fetchSuunnitelmat() {
    try {
      const result = await listSuunnitelmat();
      log.info("listSuunnitelmat:", result);
      return result;
    } catch (e) {
      log.error("Error listing suunnitelmat", e);
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
    const suunnitelmat = await this.fetchSuunnitelmat();
    this.setState({
      suunnitelmat,
    });
  }

  render() {
    return (
      <table className="table table-striped">
        <thead>
          <tr>
            <th style={{ width: "50%" }}>Nimi</th>
            <th style={{ width: "50%" }}>Sijainti</th>
          </tr>
        </thead>
        <tbody>
          {this.state.suunnitelmat.map((suunnitelma) => (
            <tr key={suunnitelma.id}>
              <td>
                <Link
                  href={(this.props.admin ? "/yllapito" : "") + `/suunnitelma/${encodeURIComponent(suunnitelma.id)}`}
                >
                  <a>{suunnitelma.name}</a>
                </Link>
              </td>
              <td>{suunnitelma.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}
