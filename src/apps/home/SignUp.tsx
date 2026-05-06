import { SignUp } from '@clerk/nextjs';

import { PublicAuthLayout } from './PublicPageShell';

export default function SignUpPage() {
  return (
    <PublicAuthLayout
      eyebrow='Create your account'
      title='Start with a workspace that respects the work.'
      description='Join Big-AGI to use powerful AI conversations in a polished, local-first product experience.'
      highlights={[
        'Bring your own model provider keys',
        'Keep conversations and settings organized',
        'Move from first prompt to focused workflow quickly',
      ]}
    >
      <SignUp />
    </PublicAuthLayout>
  );
}
