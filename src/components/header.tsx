import React from "react";
import { Kayttaja } from "../graphql/apiModel";
import { getVaylaUser } from "../services/userService";

type HeaderState = {
  user?: Kayttaja;
};

function isYllapito() {
  return window.location.href.includes("/yllapito");
}

export class Header extends React.Component<{}, HeaderState> {
  constructor(props: any) {
    super(props);
  }

  async componentDidMount() {
    if (isYllapito()) {
      const vaylaUser = await getVaylaUser();
      if (!vaylaUser) {
        window.location.pathname = "/yllapito/kirjaudu";
      }
      this.setState({
        user: vaylaUser,
      });
    } else {
      this.setState({
        user: undefined,
      });
    }
  }

  render() {
    let loginState;
    if (this.state && isYllapito()) {
      if (this.state?.user) {
        loginState = (
          <span>
            {this.state.user?.sukuNimi}, {this.state.user?.etuNimi}
          </span>
        );
      }
    } else {
      loginState = <span/>;
    }
    return (
      <div className={"row"}>
        <div className={"col"}/>
        <div className={"col col-md-auto justify-content-md-right"}>{loginState}</div>
      </div>
    );
  }
}
