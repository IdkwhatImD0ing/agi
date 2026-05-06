import { SignIn } from '@clerk/nextjs';

import { PublicAuthLayout } from './PublicPageShell';

export default function SignInPage() {
  return (
    <PublicAuthLayout
      eyebrow='Welcome back'
      title='Return to your AI workspace.'
      description='Sign in to continue your conversations, models, files, and settings from the same focused product surface.'
      highlights={[
        'Fast access to your chat workspace',
        'Provider keys and preferences stay with your account',
        'A calm interface for long-form AI work',
      ]}
    >
      <SignIn />
    </PublicAuthLayout>
  );
}
