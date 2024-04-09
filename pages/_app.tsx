import * as React from 'react';
import Head from 'next/head';
import { MyAppProps } from 'next/app';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { SpeedInsights as VercelSpeedInsights } from '@vercel/speed-insights/next';
import { useRouter } from 'next/navigation';

import { Brand } from '~/common/app.config';
import { apiQuery } from '~/common/util/trpc.client';

import 'katex/dist/katex.min.css';
import '~/common/styles/CodePrism.css';
import '~/common/styles/GithubMarkdown.css';
import '~/common/styles/NProgress.css';
import '~/common/styles/app.styles.css';

import { ProviderBackendCapabilities } from '~/common/providers/ProviderBackendCapabilities';
import { ProviderBootstrapLogic } from '~/common/providers/ProviderBootstrapLogic';
import { ProviderSingleTab } from '~/common/providers/ProviderSingleTab';
import { ProviderSnacks } from '~/common/providers/ProviderSnacks';
import { ProviderTRPCQuerySettings } from '~/common/providers/ProviderTRPCQuerySettings';
import { ProviderTheming } from '~/common/providers/ProviderTheming';
import { hasGoogleAnalytics, OptionalGoogleAnalytics } from '~/common/components/GoogleAnalytics';
import { isVercelFromFrontend } from '~/common/util/pwaUtils';
import { ClerkLoaded, ClerkProvider, useUser } from '@clerk/nextjs';
import { firestore } from 'src/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const MyApp = ({ Component, emotionCache, pageProps }: MyAppProps) => (
  <ClerkProvider>
    <Head>
      <title>{Brand.Title.Common}</title>
      <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no" />
    </Head>

    <ProviderTheming emotionCache={emotionCache}>
      <ProviderSingleTab>
        <ProviderTRPCQuerySettings>
          <ProviderBackendCapabilities>
            {/* ^ SSR boundary */}
            <ProviderBootstrapLogic>
              <ProviderSnacks>
                <ClerkLoaded>
                  <Redirect />
                  <Component {...pageProps} />
                </ClerkLoaded>
              </ProviderSnacks>
            </ProviderBootstrapLogic>
          </ProviderBackendCapabilities>
        </ProviderTRPCQuerySettings>
      </ProviderSingleTab>
    </ProviderTheming>

    {isVercelFromFrontend && <VercelAnalytics debug={false} />}
    {isVercelFromFrontend && <VercelSpeedInsights debug={false} sampleRate={1 / 2} />}
    {hasGoogleAnalytics && <OptionalGoogleAnalytics />}
  </ClerkProvider>
);

const allowedURLS = ['/', '/sign-in', '/sign-up', '/privacy', '/terms'];

const Redirect = () => {
  const { user } = useUser();
  const router = useRouter();

  const checkAndRedirect = React.useCallback(async () => {
    if (!user?.primaryEmailAddress) {
      return;
    }

    const userEmail = user.primaryEmailAddress.emailAddress;
    const userCollectionRef = doc(firestore, 'users', userEmail);

    try {
      const docSnap = await getDoc(userCollectionRef);
      if (!docSnap.exists()) {
        // Collection does not exist, create it
        await setDoc(userCollectionRef, { authorized: false });
        router.push('/');
      } else {
        // Collection exists, check if authorized
        if (!docSnap.data().authorized) {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Error checking user authorization:', error);
      // Handle any errors, e.g., redirect or show a message
    }
    console.log('User is authorized');
  }, [user, router]);

  React.useEffect(() => {
    checkAndRedirect();
  }, [user, router, checkAndRedirect]);

  return null;
};

// enables the React Query API invocation
export default apiQuery.withTRPC(MyApp);
