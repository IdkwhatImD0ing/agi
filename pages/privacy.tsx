import { LegalSection, PublicLegalDocument } from '../src/apps/home/PublicPageShell';

export default function Privacy() {
  return (
    <PublicLegalDocument title='Privacy Policy' updated='Effective Date: 1/24/2024'>
      <LegalSection>
        Welcome to bigAGI. Protecting your private information is our priority. This Privacy Policy outlines our practices concerning the collection, use, and
        protection of your information.
      </LegalSection>

      <LegalSection title='1. Information Collection'>
        <p>
          <strong>Google OAuth API:</strong> We use the Google OAuth API for authentication. We collect and store only your google email address to grant access
          to our services. No other personal information is collected. Your email is not shared with any third parties.
        </p>
        <p>
          <strong>Chat Histories:</strong> We store chat histories to enhance and evaluate the performance of bigAGI. This data is used solely for statistical
          analysis and is not linked to any personally identifiable information unless such information is voluntarily provided by you within the chat content.
        </p>
      </LegalSection>

      <LegalSection title='2. Use of Information'>
        The information we collect is used exclusively for the following purposes:
          <ul>
            <li>To facilitate access to our services by authenticating users.</li>
            <li>To analyze and improve the functionality and performance of bigAGI through statistical analysis of chat data.</li>
          </ul>
      </LegalSection>

      <LegalSection title='3. Data Security'>
        We prioritize the security of your data. We implement stringent security measures to protect against unauthorized access, alteration, disclosure, or
        destruction of your personal information and chat data.
      </LegalSection>

      <LegalSection title='4. Changes to This Privacy Policy'>
        We may update our Privacy Policy periodically. We will notify you of any changes by posting the new policy on this page. We encourage you to review
        this Privacy Policy periodically to stay informed about how we are protecting your information.
      </LegalSection>

      <LegalSection title='5. Contacting Us'>
        If you have any questions or comments about this Privacy Policy, please do not hesitate to contact us.
      </LegalSection>

      <LegalSection>
        This document was last updated on 1/24/2024.
      </LegalSection>
    </PublicLegalDocument>
  );
}
