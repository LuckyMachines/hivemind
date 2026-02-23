import React from "react";

const Title = (props) => {
  if (props.show === false) return null;
  return <span>{props.title}</span>;
};

export default Title;
