import React from "react";
import { Btn } from "./Btn";

export function BtnOutline({ children, ...props }) {
  return (
    <Btn variant="outline-accent" {...props}>
      {children}
    </Btn>
  );
}

export default BtnOutline;
