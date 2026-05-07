import * as React from 'react';

import { AppAdminUsers } from '../../src/apps/admin-users/AppAdminUsers';
import { withNextJSPerPageLayout } from '~/common/layout/withLayout';


export default withNextJSPerPageLayout({ type: 'optima' }, function AdminUsersPage() {
  return <AppAdminUsers />;
});
