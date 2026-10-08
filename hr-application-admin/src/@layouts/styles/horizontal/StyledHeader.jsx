import styled from "@emotion/styled";
import { horizontalLayoutClasses } from "@layouts/utils/layoutClasses";

const StyledHeader = styled.header`
  display: flex;
  flex-direction: column;
  inline-size: 100%;
  flex-shrink: 0;
  backdrop-filter: blur(9px);
  border-bottom: ${({ skin }) => skin === "bordered" ? "1px solid var(--mui-palette-divider)" : "none"};

  &.is-scrolled {
    background-color: ${({ isBlur }) => isBlur ? "rgb(var(--mui-palette-background-paperChannel) / 0.8)" : "rgb(var(--mui-palette-background-paperChannel))"};
    backdrop-filter: ${({ isBlur }) => (isBlur ? "blur(20px)" : "none")};
  }

  transition:
    background-color 0.3s ease,
    backdrop-filter 0.3s ease,
    box-shadow 0.3s ease;

  .${horizontalLayoutClasses.navbar}, .${horizontalLayoutClasses.navigation} {
    width: 100%;
    position: relative;
  }

  ${({ overrideStyles }) => overrideStyles}
`;

export default StyledHeader;
