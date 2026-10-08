import 'react-perfect-scrollbar/dist/css/styles.css'
import './globals.css'
import 'remixicon/fonts/remixicon.css';
import { getSettingsFromCookie } from '@core/utils/serverHelpers'

export const metadata = {
  title: 'SKL HR',
  description: 'SKL HR Application',
}

const RootLayout = async ({ children }) => {
  const settings = await getSettingsFromCookie()
  const direction = settings.direction || 'ltr'
  return (
    <html id='__next' dir={direction}>
      <body className='flex is-full min-bs-full flex-auto flex-col'>{children}</body>
    </html>
  )
}

export default RootLayout