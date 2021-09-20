import React, { Component } from "react";
import { Header } from "./header";

export class Layout extends Component {
  render() {
    const { children } = this.props;
    return (
      <>
        <Header />
        {children}
      </>
    );
  }
}
