import * as React from 'react';

import { useUser } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, Button, Card, CardContent, Chip, FormControl, Input, Sheet, Switch, Table, Typography } from '@mui/joy';

import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouterCloud } from '~/server/trpc/trpc.router-cloud';

import { FormLabelStart } from '~/common/components/forms/FormLabelStart';
import { InlineError } from '~/common/components/InlineError';
import { addSnackbar } from '~/common/components/snackbar/useSnackbarsStore';
import { apiAsyncNode } from '~/common/util/trpc.client';

import { AppSmallContainer } from '../AppSmallContainer';


const adminUsersQueryKey = ['admin', 'users'] as const;

type AdminUsersOutput = inferRouterOutputs<AppRouterCloud>['admin']['listUsers'];
type AdminUser = AdminUsersOutput['users'][number];


function upsertUser(users: AdminUser[], updatedUser: AdminUser): AdminUser[] {
  const nextUsers = users.some(user => user.email === updatedUser.email)
    ? users.map(user => user.email === updatedUser.email ? updatedUser : user)
    : [...users, updatedUser];

  return nextUsers.toSorted((a, b) => a.email.localeCompare(b.email));
}

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '-';
}

export function AppAdminUsers() {

  // state
  const [newUserEmail, setNewUserEmail] = React.useState('');

  // external state
  const { isLoaded, isSignedIn, user } = useUser();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: adminUsersQueryKey,
    queryFn: () => apiAsyncNode.admin.listUsers.query(),
    enabled: isLoaded && isSignedIn,
    retry: false,
    staleTime: 10 * 1000,
  });

  const setAuthorizedMutation = useMutation({
    mutationFn: (input: { email: string, authorized: boolean }) =>
      apiAsyncNode.admin.setUserAuthorized.mutate(input),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<AdminUsersOutput>(adminUsersQueryKey, previous => previous ? ({
        ...previous,
        users: upsertUser(previous.users, updatedUser),
      }) : previous);
      setNewUserEmail('');
      addSnackbar({
        key: 'admin-users-updated',
        type: 'success',
        message: `${updatedUser.email} is now ${updatedUser.authorized ? 'authorized' : 'unauthorized'}.`,
      });
    },
  });

  // derived state
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress || '';
  const pendingEmail = setAuthorizedMutation.variables?.email ?? null;
  const users = usersQuery.data?.users ?? [];
  const masterAdminEmail = usersQuery.data?.masterAdminEmail;

  const handleGrantAccess = (event: React.FormEvent) => {
    event.preventDefault();

    if (!newUserEmail.trim())
      return;

    setAuthorizedMutation.mutate({
      email: newUserEmail,
      authorized: true,
    });
  };

  return (
    <AppSmallContainer
      title='Admin Users'
      description='Manage who can access the app. Changes update the Firestore allowlist used by the sign-in gate.'
    >

      <Card variant='outlined'>
        <CardContent sx={{ gap: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography level='title-md'>Master admin</Typography>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                Signed in as {currentUserEmail || 'loading...'}
              </Typography>
            </Box>
            {!!masterAdminEmail && (
              <Chip variant='soft' color='primary'>
                {masterAdminEmail}
              </Chip>
            )}
          </Box>

          {usersQuery.error && <InlineError error={usersQuery.error} severity='danger' />}
          {setAuthorizedMutation.error && <InlineError error={setAuthorizedMutation.error} severity='warning' />}
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardContent sx={{ gap: 2 }}>
          <form onSubmit={handleGrantAccess}>
            <FormControl>
              <FormLabelStart title='Grant access by email' />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                <Input
                  type='email'
                  placeholder='user@example.com'
                  value={newUserEmail}
                  onChange={event => setNewUserEmail(event.target.value)}
                  disabled={setAuthorizedMutation.isPending}
                  sx={{ flex: 1, minWidth: 240 }}
                />
                <Button
                  type='submit'
                  loading={setAuthorizedMutation.isPending && pendingEmail === newUserEmail.trim().toLowerCase()}
                  disabled={!newUserEmail.trim()}
                  startDecorator={<AddIcon />}
                >
                  Grant Access
                </Button>
              </Box>
            </FormControl>
          </form>
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardContent sx={{ gap: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography level='title-md'>Allowlist</Typography>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {users.length.toLocaleString()} user{users.length === 1 ? '' : 's'} found
              </Typography>
            </Box>
            <Button
              variant='outlined'
              color='neutral'
              loading={usersQuery.isFetching}
              onClick={() => usersQuery.refetch()}
              startDecorator={<RefreshIcon />}
            >
              Refresh
            </Button>
          </Box>

          <Sheet variant='outlined' sx={{ borderRadius: 'md', overflow: 'auto' }}>
            <Table hoverRow stickyHeader sx={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th style={{ width: 140 }}>Access</th>
                  <th style={{ width: 220 }}>Updated</th>
                  <th style={{ width: 220 }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.isLoading ? (
                  <tr>
                    <td colSpan={4}>
                      <Typography level='body-sm'>Loading users...</Typography>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <Typography level='body-sm'>No allowlist users found.</Typography>
                    </td>
                  </tr>
                ) : users.map(userAccess => {
                  const isMasterAdmin = userAccess.email === masterAdminEmail;
                  const isPending = setAuthorizedMutation.isPending && pendingEmail === userAccess.email;

                  return (
                    <tr key={userAccess.email}>
                      <td>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography level='body-sm'>{userAccess.email}</Typography>
                          {isMasterAdmin && <Chip size='sm' color='primary' variant='soft'>master</Chip>}
                        </Box>
                      </td>
                      <td>
                        <Switch
                          checked={userAccess.authorized}
                          disabled={isMasterAdmin || isPending || setAuthorizedMutation.isPending}
                          onChange={event => setAuthorizedMutation.mutate({
                            email: userAccess.email,
                            authorized: event.target.checked,
                          })}
                          endDecorator={userAccess.authorized ? 'Allowed' : 'Blocked'}
                        />
                      </td>
                      <td>
                        <Typography level='body-sm'>{formatDateTime(userAccess.updatedAt)}</Typography>
                      </td>
                      <td>
                        <Typography level='body-sm'>{formatDateTime(userAccess.createdAt)}</Typography>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Sheet>
        </CardContent>
      </Card>

    </AppSmallContainer>
  );
}
