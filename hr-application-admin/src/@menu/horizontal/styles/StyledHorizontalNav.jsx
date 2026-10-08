import styled from '@emotion/styled'

const StyledHorizontalNav = styled.div`

  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  
  /* User custom styles */
  ${({ customStyles }) => customStyles}
`

export default StyledHorizontalNav