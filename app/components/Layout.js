import React from "react";
import { Container } from "semantic-ui-react";
import Head from "next/head";

const Layout = (props) => {
  return (
    <Container>
      <Head>
        <title>Hivemind</title>
      </Head>
      {props.children}
    </Container>
  );
};

export default Layout;
