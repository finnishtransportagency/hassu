import React from "react";
import { Kayttaja } from "@services/api";
import { getVaylaUser } from "@services/userService";
// import Image from "next/image";

type SuunnitelmaListState = {
  kayttaja?: Kayttaja;
};

function isYllapito() {
  return window.location.href.includes("/yllapito");
}

interface Props {
  top: number;
}

export class Header extends React.Component<Props, SuunnitelmaListState> {
  constructor(props: Props) {
    super(props);
  }

  async componentDidMount() {
    const vaylaUser = await getVaylaUser();
    if (isYllapito()) {
      if (!vaylaUser) {
        window.location.pathname = "/yllapito/kirjaudu";
      }
      this.setState({
        kayttaja: vaylaUser,
      });
    } else {
      this.setState({
        kayttaja: undefined,
      });
    }
  }

  render() {
    let loginState;
    if (this.state && isYllapito()) {
      if (this.state?.kayttaja) {
        loginState = (
          <span>
            {this.state.kayttaja?.etuNimi} {this.state.kayttaja?.sukuNimi}
          </span>
        );
      }
    }
    return (
      <header
        className="sticky bg-white z-20 w-full container mb-4 transition-all"
        style={{ top: `${this.props.top}px` }}
      >
        <div>
          <div className="sticky flex justify-between items-center border-b-4 border-gray-light py-4 md:justify-start md:space-x-1">
            {/* <Image src="/vayla-600px.jpg" alt="Väylä" width="150" height="150" /> */}
            {/* <Image src="/ely-400px.png" alt="ELY" width="150" height="150" /> */}
            <div className="mr-2 my-2 md:hidden">
              <button
                type="button"
                className="bg-white rounded-md p-4 inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-inset"
                aria-expanded="false"
              >
                <span className="sr-only">Open menu</span>
                <svg
                  className="h-12 w-12"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            <div className="hidden md:flex items-center justify-end md:flex-1 lg:w-0">
              <span>{loginState || ""}</span>
              <a href="#" className="ml-8 btn-primary">
                Poistu Palvelusta
              </a>
            </div>
          </div>
        </div>
        <nav className="hidden md:flex border-b-8 border-primary space-x-4">
          <a href="#" className="text-base uppercase py-4">
            Koti Icon
          </a>
          <a href="#" className="text-base uppercase py-4">
            Valtion väylien suunnittelu
          </a>
        </nav>
      </header>
    );
  }
}
