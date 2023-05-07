import React from 'react';
import SideNavigation, { SideNavigationProps } from '@cloudscape-design/components/side-navigation';

const navHeader = { text: 'Lord Laser', href: '#/' };
export const navItems: SideNavigationProps['items'] = [
  {
    type: 'section',
    text: 'Tools',
    items: [
      { type: 'link', text: 'Manage Feed', href: '#/feed' },
      { type: 'link', text: 'Manage Throttles', href: '#/throttles' },
    ],
  },
];

const defaultOnFollowHandler: SideNavigationProps['onFollow'] = event => {
  // keep the locked href for our demo pages
  // event.preventDefault();
};

interface NavigationProps {
  activeHref?: string;
  header?: SideNavigationProps['header'];
  items?: SideNavigationProps['items'];
  onFollowHandler?: SideNavigationProps['onFollow'];
}

export function Navigation({
  activeHref,
  header = navHeader,
  items = navItems,
  onFollowHandler = defaultOnFollowHandler,
}: NavigationProps) {
  return <SideNavigation items={items} header={header} activeHref={activeHref} onFollow={onFollowHandler} />;
}