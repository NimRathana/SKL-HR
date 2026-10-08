'use client'

// Third-party Imports
import classnames from 'classnames'

// Next Imports
import Link from '@components/Link'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  // Hooks
  const { isBreakpointReached } = useVerticalNav()

  return (
    <div
      className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-between flex-wrap gap-4')}
    >
      <p>
        <span>{`© ${new Date().getFullYear()}, Made with `}</span>
        <span>{`❤️`}</span>
        <span>{` by `}</span>
        <Link href='https://themeselection.com' target='_blank' className='text-primary'>
          Nim Rathana
        </Link>
      </p>
    </div>
  )
}

export default FooterContent
