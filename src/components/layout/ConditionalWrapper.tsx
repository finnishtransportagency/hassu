import { ReactNode } from "react";

type ChildType = JSX.Element | ReactNode | string | null | undefined;

export const ConditionalWrapper = <T extends ChildType>(props: {
  condition: boolean;
  wrapper: (child: T | undefined) => JSX.Element;
  children?: T;
}): JSX.Element => <>{props.condition ? props.wrapper(props.children) : props.children}</>;

export default ConditionalWrapper;
