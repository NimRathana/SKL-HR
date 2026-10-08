import ResetPassword from '@views/ResetPassword'
import { getServerMode } from '@core/utils/serverHelpers'

const ResetPasswordPage = () => {
  const mode = getServerMode()

  return <ResetPassword mode={mode} />
}

export default ResetPasswordPage
