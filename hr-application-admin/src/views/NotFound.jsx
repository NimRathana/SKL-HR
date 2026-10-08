'use client'

// Next Imports
import Link from '@/components/Link'

// MUI Imports
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

// Component Imports
import Illustrations from '@components/Illustrations'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'

const NotFound = ({ mode }) => {
  // Vars
  const darkImg = '/images/pages/misc-mask-dark.png'
  const lightImg = '/images/pages/misc-mask-light.png'

  // Hooks
  const miscBackground = useImageVariant(mode, lightImg, darkImg)

  return (
    <div className="flex items-center justify-center min-h-[100dvh] relative overflow-x-hidden">
      <div className="flex flex-col items-center text-center gap:6 md:gap-10">
        <div className="flex flex-col">
          <Typography
            color="text.primary"
            sx={{
              fontSize: { xs: '3rem', sm: '4rem', md: '5rem', lg: '6rem' },
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            404
          </Typography>
          <Typography
            variant="h4"
            color="text.primary"
            sx={{ fontWeight: 500 }}
          >
            Page Not Found ⚠️
          </Typography>
          <Typography sx={{ lineHeight: 2 }}>
            We couldn't find the page you are looking for.
          </Typography>
        </div>

        <Box
          component="img"
          src="/images/illustrations/characters/5.png"
          alt="error-illustration"
          sx={{
            width: '100%',
            maxWidth: { xs: 550, md: 700, lg: 800 },
            height: 'auto',
            objectFit: 'contain',
            mt: { xs: 3, md: 5 },
          }}
        />

        <Button
          href="/"
          component={Link}
          variant="contained"
          sx={{ my: { xs: 3, md: 5 } }}
        >
          Back to Home
        </Button>
      </div>

      {/* Background Mask */}
      <Illustrations maskImg={{ src: miscBackground }} />
    </div>
  )
}

export default NotFound