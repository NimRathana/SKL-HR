import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { HorizontalNavProvider } from '@menu/contexts/horizontalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import CustomThemeProvider from './theme'
import { getMode, getSettingsFromCookie } from '@core/utils/serverHelpers'
import DirectionCacheProvider from './DirectionCacheProvider'
import GlobalNotification from './GlobalNotification'

const Providers = async props => {
  const { children } = props

  const mode = await getMode()
  const settingsCookie = await getSettingsFromCookie()

  return (
    <SettingsProvider settingsCookie={settingsCookie} mode={mode}>
      <VerticalNavProvider>
        <HorizontalNavProvider>
          <DirectionCacheProvider>
            <CustomThemeProvider>
              {children}
              <GlobalNotification />
            </CustomThemeProvider>
          </DirectionCacheProvider>
        </HorizontalNavProvider>
      </VerticalNavProvider>
    </SettingsProvider>
  )
}

export default Providers