import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import Providers from '@components/Providers'
import AuthGuard from '@components/auth/AuthGuard'
import LayoutWrapper from '@layouts/LayoutWrapper'
import VerticalLayout from '@layouts/VerticalLayout'
import HorizontalLayout from '@layouts/HorizontalLayout'
import VerticalNavigation from '@components/layout/vertical/Navigation'
import VerticalNavbar from '@components/layout/vertical/Navbar'
import VerticalFooter from '@components/layout/vertical/Footer'
import HorizontalNavbar from '@components/layout/horizontal/Navbar'
import HorizontalNavigation from '@components/layout/horizontal/Navigation'
import HorizontalNav from '@menu/horizontal/HorizontalNav'

const ProtectedLayout = async ({ children }) => {
  const cookieStore = await cookies()

  if (!cookieStore.get('authToken')?.value) {
    redirect('/login')
  }

  return (
    <Providers>
      <AuthGuard>
        <LayoutWrapper
          verticalLayout={
            <VerticalLayout
              navigation={<VerticalNavigation />}
              navbar={<VerticalNavbar />}
              footer={<VerticalFooter />}
            >
              {children}
            </VerticalLayout>
          }
          horizontalLayout={
            <HorizontalNav customBreakpoint='800px'>
              <HorizontalLayout
                navbar={<HorizontalNavbar />}
                navigation={<HorizontalNavigation />}
                footer={<VerticalFooter />}
              >
                {children}
              </HorizontalLayout>
            </HorizontalNav>
          }
        />
      </AuthGuard>
    </Providers>
  )
}

export default ProtectedLayout
