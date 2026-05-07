import * as React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { MyAppProps } from 'next/app';
import { useRouter } from 'next/router';
import { ClerkLoaded, ClerkProvider, useUser } from '@clerk/nextjs';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Brand } from '~/common/app.config';
import { apiQuery } from '~/common/util/trpc.client';
import { firestore } from '../src/firebase';


// [server-client-safe] dynamic imports to avoid webpack bundling issues with next/navigation
const VercelAnalytics = dynamic(() => import('@vercel/analytics/next').then(mod => mod.Analytics), { ssr: false });
const VercelSpeedInsights = dynamic(() => import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights), { ssr: false });


import 'katex/dist/katex.min.css';
import '~/common/styles/CodePrism.css';
import '~/common/styles/GithubMarkdown.css';
import '~/common/styles/NProgress.css';
import '~/common/styles/agi.effects.css';
import '~/common/styles/app.styles.css';

import { ErrorBoundary } from '~/common/components/ErrorBoundary';
import { isMasterAdminEmail, normalizeAdminEmail } from '~/common/admin/admin.config';
import { hasGoogleAnalytics, OptionalGoogleAnalytics } from '~/common/components/3rdparty/GoogleAnalytics';
import { hasPostHogAnalytics, OptionalPostHogAnalytics } from '~/common/components/3rdparty/PostHogAnalytics';
import { OverlaysInsert } from '~/common/layout/overlays/OverlaysInsert';
import { SnackbarInsert } from '~/common/components/snackbar/SnackbarInsert';
import { ProviderBackendCapabilities } from '~/common/providers/ProviderBackendCapabilities';
import { ProviderBootstrapLogic } from '~/common/providers/ProviderBootstrapLogic';
import { ProviderSingleTab } from '~/common/providers/ProviderSingleTab';
import { ProviderTheming } from '~/common/providers/ProviderTheming';
import { Is } from '~/common/util/pwaUtils';


const Big_AGI_App = ({ Component, emotionCache, pageProps }: MyAppProps) => {

  // We are using a nextjs per-page layout pattern to bring the (Optima) layout creation to a shared place
  // This reduces the flicker and the time switching between apps, and seems to not have impact on
  // the build. This is a good trade-off for now.
  const getLayout = Component.getLayout ?? ((page: any) => page);

  return <ClerkProvider>

    <Head>
      <title>{Brand.Title.Common}</title>
      <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no" />
    </Head>

    <ProviderTheming emotionCache={emotionCache}>
      <ProviderSingleTab>
        <ProviderBackendCapabilities>
          {/* ^ Backend capabilities & SSR boundary */}
          <ErrorBoundary outer>
            <ProviderBootstrapLogic>
              <SnackbarInsert />
              <ClerkLoaded>
                <Redirect />
                {getLayout(<Component {...pageProps} />)}
              </ClerkLoaded>
              <OverlaysInsert />
            </ProviderBootstrapLogic>
          </ErrorBoundary>
        </ProviderBackendCapabilities>
      </ProviderSingleTab>
    </ProviderTheming>

    {hasGoogleAnalytics && <OptionalGoogleAnalytics />}
    {hasPostHogAnalytics && <OptionalPostHogAnalytics />}
    {Is.Deployment.VercelFromFrontend && <VercelAnalytics debug={false} />}
    {Is.Deployment.VercelFromFrontend && <VercelSpeedInsights debug={false} sampleRate={1 / 2} />}

  </ClerkProvider>;
};

const Redirect = () => {
  const { user } = useUser();
  const router = useRouter();

  const checkAndRedirect = React.useCallback(async () => {
    if (!user?.primaryEmailAddress) {
      return;
    }

    const userEmail = normalizeAdminEmail(user.primaryEmailAddress.emailAddress);
    const isMasterAdmin = isMasterAdminEmail(userEmail);
    const userCollectionRef = doc(firestore, 'users', userEmail);

    try {
      const docSnap = await getDoc(userCollectionRef);

      if (!docSnap.exists()) {
        await setDoc(userCollectionRef, { email: userEmail, authorized: isMasterAdmin });
        if (!isMasterAdmin)
          await router.push('/');
        return;
      }

      if (!isMasterAdmin && !docSnap.data().authorized) {
        await router.push('/');
      }
    } catch (error) {
      console.error('Error checking user authorization:', error);
    }
  }, [user, router]);

  React.useEffect(() => {
    void checkAndRedirect();
  }, [checkAndRedirect]);

  return null;
};

// Initializes React Query and tRPC, and enables the tRPC React Query hooks (apiQuery).
export default apiQuery.withTRPC(Big_AGI_App);
