// Third-party Imports
import styled from '@emotion/styled'

const StyledHorizontalSubMenuContent = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  min-width: 240px;
  max-width: 360px;
  max-height: min(360px, calc(100vh - 120px));
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 22px;
  background: var(--mui-palette-background-paper);
  border: 1px solid var(--mui-palette-divider);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.16);
  z-index: 9999;
  transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  transform: translateY(${({ open }) => (open ? '0' : '10px')});
  opacity: ${({ open }) => (open ? 1 : 0)};
  visibility: ${({ open }) => (open ? 'visible' : 'hidden')};
  pointer-events: ${({ open }) => (open ? 'auto' : 'none')};

  ul {
    list-style: none;
    margin: 0;
    padding: 10px 0;
  }

  ul > li {
    padding: 0;
  }

  ul > li:hover {
    background-color: var(--mui-palette-action-hover);
  }

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(15, 23, 42, 0.16);
    border-radius: 999px;
  }

  ${({ rootStyles }) => rootStyles}
`

export default StyledHorizontalSubMenuContent
