import React from "react";

const Title = (props) => {
  let content =
    props.show == false ? (
      ""
    ) : (
      <div>
        <h1>{props.title}</h1>
        {props.children}
      </div>
    );
  return content;
};

export default Title;
