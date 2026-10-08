import styled from '@emotion/styled'
import { menuClasses } from '../../utils/menuClasses'
import { lighten } from '@mui/material/styles'

const StyledHorizontalSubMenu = styled.li`
    position: relative;
    display: inline-block;
    list-style: none;
    overflow: visible;
    margin-block-start: 0;

    > .${menuClasses.button} {
      display: flex;
      align-items: center;
      padding-block: ${({ level = 0 }) => level > 0 ? '8px' : '5px'};
      padding-inline-start: ${({ level = 0 }) => level > 0 ? '14px' : '20px'};
      padding-inline-end: ${({ level = 0 }) => level > 0 ? '14px' : '20px'};
      border-radius: 50px;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      white-space: nowrap;
      transition: all 0.2s ease-in-out;

      &:hover {
        background-color: var(--mui-palette-action-hover);
      }
    }

    &.${menuClasses.active} > .${menuClasses.button} {
      color: ${({ theme }) => theme.palette.primary.contrastText};
      background: ${({ theme }) => {
        const mainColor = theme.palette.primary.main
        const lightColor = lighten(mainColor, 0.5)
        return `linear-gradient(90deg, ${mainColor}, ${lightColor})`
      }};
      & .icon {
        color: inherit;
      }
    }

    .${menuClasses.subMenuExpandIcon} {
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      margin-inline-start: ${({ theme }) => theme.spacing(2)};

      & > i,
      & > svg {
        font-size: inherit;
        transition: transform 0.2s ease-in-out;
      }
    }

    &.${menuClasses.open} > .${menuClasses.button} .${menuClasses.subMenuExpandIcon} > i,
    &.${menuClasses.open} > .${menuClasses.button} .${menuClasses.subMenuExpandIcon} > svg {
      transform: rotate(90deg);
    }
      
    .${menuClasses.icon} {
      display: flex;
      align-items: center;
    }

    ${({ menuItemStyles }) => menuItemStyles}
    ${({ rootStyles }) => rootStyles}
`

export default StyledHorizontalSubMenu