import React from "react";
import { Suunnitelma } from "../API";
import { API, graphqlOperation } from "aws-amplify";
import { listSuunnitelmat } from "../graphql/queries";
import log from "loglevel";
import Link from "next/link";

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
    const result = await API.graphql(graphqlOperation(listSuunnitelmat));
    log.info("listSuunnitelmat:", result);

    // @ts-ignore
    return result.data.listSuunnitelmat as Suunnitelma[];
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
          <th style={{ width: '50%' }}>Nimi</th>
          <th style={{ width: '50%' }}>Sijainti</th>
        </tr>
        </thead>
        <tbody>
          {this.state.suunnitelmat.map((suunnitelma, index) => (
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
