import { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Chip, Typography } from '@mui/joy';
import { Show, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';

import { firestore } from '../../firebase';
import { PublicPageShell } from './PublicPageShell';


const valueCards = [
  {
    title: 'One workspace',
    description: 'Bring chat, files, models, and tools into a focused interface built for long sessions.',
  },
  {
    title: 'Model freedom',
    description: 'Use your own provider keys and move between leading AI systems without changing your workflow.',
  },
  {
    title: 'Local-first by design',
    description: 'Keep the product fast, personal, and resilient with the project architecture Big-AGI is known for.',
  },
];


export default function Home() {
  const { isSignedIn, user } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuthorization = async () => {
      if (user) {
        const userEmail = user.primaryEmailAddress?.emailAddress || '';
        const userDocRef = doc(firestore, 'users', userEmail);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setIsAuthorized(userDoc.data().authorized);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      setIsAuthCheckComplete(true);
    };

    checkAuthorization();
  }, [user]);

  return (
    <PublicPageShell
      actions={(
        <>
          <Show when='signed-in'>{isSignedIn && <UserButton />}</Show>
          <Show when='signed-out'>
            <SignInButton>
              <Button variant='plain' color='neutral'>
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton>
              <Button variant='solid' color='neutral'>
                Sign Up
              </Button>
            </SignUpButton>
          </Show>
        </>
      )}
    >
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)' },
        gap: { xs: 3, md: 4 },
        alignItems: 'center',
      }}>
        <Card variant='plain' sx={{
          p: { xs: 2.5, md: 4 },
          borderRadius: 'xl',
          boxShadow: 'lg',
          bgcolor: 'background.surface',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <Box sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(circle at 85% 20%, rgb(var(--joy-palette-primary-mainChannel) / 0.12), transparent 18rem)',
          }} />
          <CardContent sx={{ position: 'relative', gap: 2.25 }}>
            <Chip color='primary' variant='soft' size='sm' sx={{ alignSelf: 'flex-start' }}>
              AI workspace for serious conversations
            </Chip>
            <Typography level='h1' sx={{
              maxWidth: 720,
              fontSize: { xs: '2.5rem', md: '4.5rem' },
              lineHeight: 0.95,
              letterSpacing: '-0.06em',
            }}>
              Big-AGI, refined for deep work.
            </Typography>
            <Typography level='title-lg' sx={{ maxWidth: 640, color: 'text.secondary' }}>
              Explore the boundaries of AI in a fast, local-first interface that keeps the focus on the conversation.
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, pt: 1 }}>
              <Show when='signed-in'>
                {isAuthCheckComplete
                  ? isAuthorized ? (
                    <Button size='lg' variant='solid' color='neutral' onClick={() => router.push('/chat')}>
                      Start a Conversation
                    </Button>
                  ) : (
                    <Card variant='soft' color='warning' sx={{ maxWidth: 520 }}>
                      <Typography level='body-sm'>
                        Sorry, you were not given permission to access the chat. Contact Bill for more details.
                      </Typography>
                    </Card>
                  )
                  : (
                    <Button size='lg' variant='solid' color='neutral' disabled>
                      Checking Access
                    </Button>
                  )}
              </Show>
              <Show when='signed-out'>
                <SignUpButton>
                  <Button size='lg' variant='solid' color='neutral'>
                    Create Account
                  </Button>
                </SignUpButton>
                <SignInButton>
                  <Button size='lg' variant='soft' color='neutral'>
                    Sign In
                  </Button>
                </SignInButton>
              </Show>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{
          display: 'grid',
          gap: 1.5,
        }}>
          {valueCards.map((card, idx) => (
            <Card key={card.title} variant={idx === 0 ? 'solid' : 'soft'} color={idx === 0 ? 'neutral' : undefined} invertedColors={idx === 0} sx={{
              borderRadius: 'lg',
              boxShadow: idx === 0 ? 'md' : undefined,
            }}>
              <CardContent>
                <Typography level='title-md'>{card.title}</Typography>
                <Typography level='body-sm'>{card.description}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    </PublicPageShell>
  );
}
