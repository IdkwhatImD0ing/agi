import * as React from 'react';

import { Box, Button, Card, CardContent, Container, Divider, Typography } from '@mui/joy';

import { Link } from '~/common/components/Link';


export function PublicPageShell(props: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <Box sx={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      bgcolor: 'background.level1',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `
          radial-gradient(circle at 15% 12%, rgb(var(--joy-palette-primary-mainChannel) / 0.16) 0, transparent 28rem),
          radial-gradient(circle at 85% 0%, rgb(var(--joy-palette-neutral-500Channel) / 0.12) 0, transparent 24rem),
          linear-gradient(180deg, var(--joy-palette-background-surface), transparent 38rem)
        `,
      },
    }}>

      <Container maxWidth='lg' sx={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        pt: { xs: 2, md: 3 },
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          borderRadius: 'xl',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.surface',
          boxShadow: 'sm',
          px: { xs: 1.25, md: 1.5 },
          py: 1,
        }}>
          <Button
            component={Link}
            href='/'
            noLinkStyle
            variant='plain'
            color='neutral'
            sx={{
              fontWeight: 'lg',
              letterSpacing: '-0.02em',
              px: 1,
            }}
          >
            big-AGI
          </Button>

          {!!props.actions && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1,
            }}>
              {props.actions}
            </Box>
          )}
        </Box>
      </Container>

      <Container maxWidth={props.maxWidth ?? 'lg'} sx={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        py: { xs: 4, md: 7 },
      }}>
        {props.children}
      </Container>

      <Container maxWidth='lg' sx={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        pb: { xs: 2, md: 3 },
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          color: 'text.tertiary',
        }}>
          <Typography level='body-xs'>
            Professional AI conversations, local-first.
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {props.footer ?? (
              <>
                <Button component={Link} href='/terms' noLinkStyle variant='plain' color='neutral' size='sm'>
                  Terms
                </Button>
                <Button component={Link} href='/privacy' noLinkStyle variant='plain' color='neutral' size='sm'>
                  Privacy
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export function PublicAuthLayout(props: {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  children: React.ReactNode;
}) {
  return (
    <PublicPageShell maxWidth='lg'>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.9fr) minmax(320px, 420px)' },
        gap: { xs: 3, md: 5 },
        alignItems: 'center',
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography level='body-sm' sx={{ color: 'primary.plainColor', fontWeight: 'lg' }}>
            {props.eyebrow}
          </Typography>
          <Typography level='h1' sx={{
            fontSize: { xs: '2.25rem', md: '3.75rem' },
            lineHeight: 1,
            letterSpacing: '-0.055em',
          }}>
            {props.title}
          </Typography>
          <Typography level='title-md' sx={{ color: 'text.secondary', maxWidth: 560 }}>
            {props.description}
          </Typography>

          <Box sx={{
            display: 'grid',
            gap: 1,
            pt: 1,
            maxWidth: 520,
          }}>
            {props.highlights.map(highlight => (
              <Box key={highlight} sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.25,
                borderRadius: 'md',
                bgcolor: 'background.surface',
                border: '1px solid',
                borderColor: 'divider',
              }}>
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  bgcolor: 'primary.solidBg',
                  flexShrink: 0,
                }} />
                <Typography level='body-sm'>{highlight}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          p: { xs: 1, sm: 2 },
          borderRadius: 'xl',
          bgcolor: 'background.surface',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'lg',
          '& .cl-rootBox': {
            width: '100%',
          },
          '& .cl-cardBox': {
            width: '100%',
            boxShadow: 'none',
          },
          '& .cl-card': {
            width: '100%',
            boxShadow: 'none',
          },
        }}>
          {props.children}
        </Box>
      </Box>
    </PublicPageShell>
  );
}

export function PublicLegalDocument(props: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <PublicPageShell maxWidth='md'>
      <Card variant='plain' sx={{
        borderRadius: 'xl',
        boxShadow: 'lg',
        bgcolor: 'background.surface',
      }}>
        <CardContent sx={{ gap: 3, p: { xs: 2, md: 4 } }}>
          <Box>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', mb: 1 }}>
              {props.updated}
            </Typography>
            <Typography level='h1' sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              letterSpacing: '-0.045em',
            }}>
              {props.title}
            </Typography>
          </Box>

          <Divider />

          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
            '& ul': {
              my: 1,
              pl: 3,
            },
            '& li': {
              marginBlock: 0.5,
            },
          }}>
            {props.children}
          </Box>
        </CardContent>
      </Card>
    </PublicPageShell>
  );
}

export function LegalSection(props: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {!!props.title && (
        <Typography level='h3' component='h2' sx={{ fontSize: '1.25rem', letterSpacing: '-0.025em' }}>
          {props.title}
        </Typography>
      )}
      <Typography component='div' level='body-md' sx={{ color: 'text.secondary', lineHeight: 1.75 }}>
        {props.children}
      </Typography>
    </Box>
  );
}
