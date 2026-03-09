import React from "react";
import Head from "next/head";

const Layout = (props) => {
  return (
    <div className="app-container">
      <Head>
        <title>HJIVEMIND</title>
      </Head>
      {props.children}
    </div>
  );
};

export default Layout;
