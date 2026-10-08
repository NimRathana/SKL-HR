'use client'

// React Imports
import {
  Children,
  cloneElement,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"

// Next Imports
import { usePathname } from "next/navigation"

// Third-party Imports
import classnames from "classnames"

// Component Imports
import SubMenuContent from "./SubMenuContent"
import MenuButton from "./MenuButton"

// Icon Imports
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"

// Hook Imports
import useHorizontalMenu from "../hooks/useHorizontalMenu"

// Util Imports
import { menuClasses } from "../utils/menuClasses"
import { confirmUrlInChildren, renderMenuIcon } from "../utils/menuUtils"

// Styled Component Imports
import StyledHorizontalSubMenu from "./styles/StyledHorizontalSubMenu"
import StyledMenuLabel from "../styles/StyledMenuLabel"
import StyledMenuPrefix from "../styles/StyledMenuPrefix"
import StyledMenuSuffix from "../styles/StyledMenuSuffix"

const SubMenu = (props, ref) => {
  // Props
  const {
    children,
    className,
    label,
    icon,
    prefix,
    suffix,
    defaultOpen,
    level = 0,
    disabled = false,
    rootStyles,
    onOpenChange,
    ...rest
  } = props

  // States
  const [active, setActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isContentHovered, setIsContentHovered] = useState(false)

  // Refs
  const contentRef = useRef(null)
  const buttonRef = useRef(null)
  const hoverTimeoutRef = useRef(null)

  // Hooks
  const id = useId()
  const pathname = usePathname()

  const {
    renderExpandIcon,
    renderExpandedMenuItemIcon,
    menuItemStyles,
    openSubmenu,
    toggleOpenSubmenu,
    transitionDuration,
    openSubmenusRef,
    textTruncate,
    trigger = 'hover'
  } = useHorizontalMenu()

  // Vars
  const childNodes = Children.toArray(children).filter(Boolean)
  const isSubMenuOpen = trigger === 'hover'
    ? isHovered || isContentHovered
    : (openSubmenu?.some((item) => item.id === id) ?? false)

  const handleToggle = () => {
    if (disabled) return
    toggleOpenSubmenu?.({ level, label, active, id })
    onOpenChange?.(!isSubMenuOpen)
  }

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }

  const closeSubMenu = () => {
    setIsHovered(false)
    setIsContentHovered(false)
    onOpenChange?.(false)
  }

  const scheduleClose = () => {
    if (disabled || trigger !== 'hover') return

    clearHoverTimeout()
    hoverTimeoutRef.current = setTimeout(() => {
      closeSubMenu()
      hoverTimeoutRef.current = null
    }, 160)
  }

  const handleMouseEnter = () => {
    if (disabled || trigger !== 'hover') return

    clearHoverTimeout()
    setIsHovered(true)
    onOpenChange?.(true)
  }

  const handleMouseLeave = () => {
    if (disabled || trigger !== 'hover') return

    scheduleClose()
  }

  const handleContentMouseEnter = () => {
    if (disabled || trigger !== 'hover') return

    clearHoverTimeout()
    setIsContentHovered(true)
    onOpenChange?.(true)
  }

  const handleContentMouseLeave = () => {
    if (disabled || trigger !== 'hover') return

    setIsContentHovered(false)
    scheduleClose()
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
    }
  }, [])

  const getSubMenuItemStyles = (element) => {
    if (menuItemStyles) {
      const params = {
        level,
        disabled,
        active,
        isSubmenu: true,
        open: isSubMenuOpen,
      }
      const styleFunction = menuItemStyles[element]
      if (styleFunction) {
        return typeof styleFunction === "function"
          ? styleFunction(params)
          : styleFunction
      }
    }
  }

  // Initial open logic
  useEffect(() => {
    if (confirmUrlInChildren(children, pathname)) {
      openSubmenusRef?.current?.push({ level, label, active: true, id })
    } else if (defaultOpen) {
      openSubmenusRef?.current?.push({ level, label, active: false, id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Active state on route change
  useEffect(() => {
    if (confirmUrlInChildren(children, pathname)) {
      setActive(true)
    } else {
      setActive(false)
    }
  }, [pathname, children])

  return (
    <StyledHorizontalSubMenu
      ref={ref}
      level={level}
      className={classnames(
        menuClasses.subMenuRoot,
        { [menuClasses.active]: active },
        { [menuClasses.disabled]: disabled },
        { [menuClasses.open]: isSubMenuOpen },
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      menuItemStyles={getSubMenuItemStyles("root")}
      rootStyles={rootStyles}
    >
      <MenuButton
        onClick={handleToggle}
        title={props.title}
        className={classnames(menuClasses.button, {
          [menuClasses.active]: active,
        })}
        tabIndex={disabled ? -1 : 0}
        level={level}
        disabled={disabled}
        buttonStyles={getSubMenuItemStyles('button')}
        ref={buttonRef}
        {...rest}
      >
        {/* Render Icon */}
        {renderMenuIcon({
          icon,
          level,
          active,
          disabled,
          renderExpandedMenuItemIcon,
          styles: getSubMenuItemStyles("icon"),
        })}

        {/* Prefix */}
        {prefix && (
          <StyledMenuPrefix
            className={menuClasses.prefix}
            rootStyles={getSubMenuItemStyles("prefix")}
          >
            {prefix}
          </StyledMenuPrefix>
        )}

        {/* Label */}
        <StyledMenuLabel
          className={menuClasses.label}
          rootStyles={getSubMenuItemStyles("label")}
          textTruncate={textTruncate}
          style={{
            display: 'flex',
            alignItems: 'center',
            lineHeight: 1,
          }}
        >
          {label}
        </StyledMenuLabel>

        {/* Suffix */}
        {suffix && (
          <StyledMenuSuffix
            className={menuClasses.suffix}
            rootStyles={getSubMenuItemStyles("suffix")}
          >
            {suffix}
          </StyledMenuSuffix>
        )}

        {/* Expand Icon - Down Chevron for Top Level, Right Chevron for Sub-levels */}
        <span className={menuClasses.subMenuExpandIcon} style={{ display: 'flex', alignItems: 'center' }}>
          {renderExpandIcon ? (
            renderExpandIcon({ level, disabled, active, open: isSubMenuOpen })
          ) : level === 0 ? (
            <KeyboardArrowDownIcon
              fontSize="small"
              style={{
                transition: "transform 0.2s ease-in-out",
                transform: isSubMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          ) : (
            <ChevronRightIcon fontSize="small" />
          )}
        </span>
      </MenuButton>

      {/* Dropdown Content */}
      <SubMenuContent
        ref={contentRef}
        anchorRef={buttonRef}
        open={isSubMenuOpen}
        level={level}
        transitionDuration={transitionDuration}
        rootStyles={getSubMenuItemStyles('subMenuContent')}
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleContentMouseLeave}
      >
        { childNodes.map((node) => cloneElement(node, { level: level + 1 })) }
      </SubMenuContent>
    </StyledHorizontalSubMenu>
  )
}

export default forwardRef(SubMenu)