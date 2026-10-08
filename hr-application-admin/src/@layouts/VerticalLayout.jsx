// Third-party Imports
import classnames from 'classnames'

// Component Imports
import LayoutContent from './components/vertical/LayoutContent'

// Util Imports
import { verticalLayoutClasses } from './utils/layoutClasses'

const VerticalLayout = props => {
  // Props
  const { navbar, footer, navigation, children } = props
  return (
    <div className={classnames(verticalLayoutClasses.root, 'flex flex-auto min-w-0 min-h-0')}>
      {navigation || null}
      <div className={classnames(verticalLayoutClasses.contentWrapper, 'flex flex-col min-is-0 min-bs-0 is-full min-h-0')}>
        {navbar || null}
        {/* Content */}
        <LayoutContent>{children}</LayoutContent>
        {footer || null}
      </div>
    </div>
  )
}

export default VerticalLayout
