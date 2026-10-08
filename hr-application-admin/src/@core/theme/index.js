// Next Imports
import { Inter, Noto_Sans_Khmer  } from 'next/font/google'

// Theme Options Imports
import overrides from './overrides'
import colorSchemes from './colorSchemes'
import spacing from './spacing'
import shadows from './shadows'
import customShadows from './customShadows'
import typography from './typography'

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800', '900'] })
const khmer = Noto_Sans_Khmer({ weight: ['400','700'], display: 'swap' })

const theme = (mode, direction, skin) => {
  return {
    direction,
    components: overrides(skin),
    colorSchemes: colorSchemes(skin),
    ...spacing,
    shape: {
      borderRadius: 6,
      customBorderRadius: {
        xs: 2,
        sm: 4,
        md: 6,
        lg: 8,
        xl: 10
      }
    },
    shadows: shadows(mode),
    typography: typography(khmer.style.fontFamily),
    customShadows: customShadows(mode),
    mainColorChannels: {
      light: '46 38 61',
      dark: '231 227 252',
      lightShadow: '46 38 61',
      darkShadow: '19 17 32'
    }
  }
}

export default theme
