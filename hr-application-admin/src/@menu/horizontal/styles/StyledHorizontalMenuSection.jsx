// Third-party Imports
import styled from '@emotion/styled'

const StyledHorizontalMenuSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .${'menuSectionLabel'} {
    font-size: 13px;
    color: var(--mui-palette-text-disabled);
  }

  ${({ rootStyles }) => rootStyles}
`

export default StyledHorizontalMenuSection
