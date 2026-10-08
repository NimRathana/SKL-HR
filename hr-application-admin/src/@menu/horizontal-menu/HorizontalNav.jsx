'use client'

import classnames from 'classnames'

const HorizontalNav = ({ height = 64, className, children, containerClassName, ...rest }) => {
  return (
    <div className={classnames('materio-horizontal-container', containerClassName)}>
      {/* Place the menu items inside a ul so authors can pass <MenuItem/> components */}
      <ul className="materio-horizontal-menu">{children}</ul>
    </div>
  )
}

export default HorizontalNav
