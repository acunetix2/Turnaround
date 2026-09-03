import React from 'react';
import { LegalDocumentPage } from './LegalDocumentPage';

export const PrivacyPolicyPage: React.FC = () => (
  <LegalDocumentPage title="Privacy Policy" icon="privacy">
    <p>This policy explains how Turnaround Logistics Systems processes information when you use the Turnaround platform. We collect account, company, fleet, trip, location, telemetry, and usage information needed to provide secure fleet operations, analytics, notifications, support, and service improvements.</p>
    <p className="mt-5">We do not sell personal information. We share data only with service providers needed to operate the platform, connected services selected by your organization, professional advisers, regulators, or authorities where legally required. Data may be processed internationally with appropriate safeguards.</p>
    <p className="mt-5">We retain information for as long as necessary to provide the service, meet legal and contractual obligations, resolve disputes, and maintain business records. We use access controls, encryption in transit, monitoring, and backups, but no online service can guarantee absolute security.</p>
    <p className="mt-5">Subject to applicable law, you may request access, correction, deletion, restriction, objection, or a copy of your information by contacting your organization administrator or privacy@turnaround.io. We may verify your identity before responding.</p>
    <p className="mt-5">We may update this policy from time to time and will publish the revised effective date.</p>
  </LegalDocumentPage>
);
