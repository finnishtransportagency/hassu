import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { styled } from "@mui/material";
import HassuLink, { HassuLinkProps } from "./HassuLink";

const StyledLink = styled(HassuLink)((props) => ({
  display: "inline-block",
  "&:hover": {
    textDecoration: "underline",
    cursor: "pointer",
  },
  fontWeight: 700,
  color: props.theme.palette.primary.dark,
}));

const ExternalStyledLink = styled(
  ({ className, children, ref: _ref, target = "_blank", ...props }: Omit<HassuLinkProps, "useNextLink" | "nextLinkOptions">) => (
    <span className={className}>
      <StyledLink target={target} {...props}>
        {children}
      </StyledLink>
      <HassuLink target={target} href={props.href}>
        <FontAwesomeIcon className="ml-3 text-primary-dark" icon="external-link-alt" />
      </HassuLink>
    </span>
  )
)();

export default StyledLink;
export { StyledLink, ExternalStyledLink };
