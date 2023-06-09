import ButtonLink, { ButtonLinkProps } from "@components/button/ButtonLink";
import { styled, experimental_sx as sx } from "@mui/material";

const ResponsiveButtonLink = styled(ButtonLink)((props: ButtonLinkProps & { lang?: string }) => {
  return sx({
    whiteSpace: "nowrap",
    fontSize:
      props.lang == "fi"
        ? { lg: "medium!important", xl: "normal!important" }
        : { xs: "medium!important", sm: "small!important", md: "small!important", lg: "small!important", xl: "medium!important" },
  });
});

export default ResponsiveButtonLink;
