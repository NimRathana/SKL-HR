export const MenuData = [
  {
    type: 'item',
    label: 'Dashboard',
    icon: <i className='ri-home-smile-line' />,
    href: '/dashboard'
  },
  {
    type: 'section',
    label: 'HR Management',
    children: [
      {
        type: 'item',
        label: 'Users',
        href: '/users',
        roles: ['admin', 'owner'],
        icon: <i className='ri-user-3-line' />
      },
      {
        type: 'item',
        label: 'Tenants',
        href: '/tenants',
        roles: ['admin'],
        icon: <i className='ri-building-line' />
      },
      {
        type: 'item',
        label: 'Companies',
        href: '/companies',
        roles: ['admin', 'owner'],
        icon: <i className='ri-building-4-line' />
      },
      {
        type: 'item',
        label: 'Positions',
        href: '/positions',
        icon: <i className='ri-briefcase-4-line' />
      },
      {
        type: 'submenu',
        label: 'Employees',
        icon: <i className='ri-team-line' />,
        children: [
          {
            type: 'item',
            label: 'Employees',
            href: '/employees',
          },
          {
            type: 'item',
            label: 'Employment History',
            href: '/employment-history',
          },
          {
            type: 'item',
            label: 'Salary History',
            href: '/salary-history',
          },
        ]
      },
    ]
  },
  {
    type: 'item',
    label: 'Security Monitoring',
    href: '/security-events',
    roles: ['admin'],
    icon: <i className='ri-shield-keyhole-line' />
  },
  {
    type: 'item',
    label: 'System Parameters',
    href: '/system-parameters',
    roles: ['admin'],
    icon: <i className='ri-settings-3-line' />
  },
  {
    type: 'section',
    label: 'Subscription',
    roles: ['admin', 'owner'],
    children: [
      {
        type: 'submenu',
        label: 'Subscription',
        icon: <i className='ri-bank-card-line' />,
        roles: ['admin', 'owner'],
        children: [
          {
            type: 'item',
            label: 'Billing',
            href: '/billing',
            roles: ['admin', 'owner'],
          },
          {
            type: 'item',
            label: 'Admin Plans',
            href: '/admin/plans',
            roles: ['admin'],
          }
        ]
      }
    ]
  }
]