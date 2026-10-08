import Providers from '@components/Providers'

const Layout = async ({ children }) => {
  return <Providers>{children}</Providers>
}

export default Layout