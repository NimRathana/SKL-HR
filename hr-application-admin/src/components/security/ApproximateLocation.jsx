import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

const ApproximateLocation = ({ location }) => {
  const normalizedLocation = typeof location === 'string' ? location.trim() : ''

  if (!normalizedLocation) return <Typography variant="body2" color="text.secondary">Unknown</Typography>

  const googleMapsUrl =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedLocation)}`

  return (
    <Link
      href={googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View approximate IP-based location ${normalizedLocation} on Google Maps`}
      title="Approximate location based on IP address"
    >
      📍 {normalizedLocation}
    </Link>
  )
}

export default ApproximateLocation
