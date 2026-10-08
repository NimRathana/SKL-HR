// Third-party Imports
import styled from '@emotion/styled'

// Config Imports
import themeConfig from '@configs/themeConfig'

const StyledMain = styled.main`
  padding-block: 0.5rem;
  padding-inline: ${themeConfig.layoutPadding}px;
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  min-block-size: 0;
  min-inline-size: 0;
  inline-size: 100%;
  overflow: hidden;
  /* padding-inline: ${({ isContentCompact }) => isContentCompact ? '0' : `${themeConfig.layoutPadding}px`}; */
  ${({ isContentCompact }) =>
    isContentCompact &&
    `
    margin-inline: auto;
    max-inline-size: ${themeConfig.compactContentWidth}px;
  `}
`

export default StyledMain
