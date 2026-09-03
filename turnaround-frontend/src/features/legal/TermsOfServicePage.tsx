import React from 'react';
import { LegalDocumentPage } from './LegalDocumentPage';

export const TermsOfServicePage: React.FC = () => (
  <LegalDocumentPage title="Terms and Conditions" icon="terms">
    <p>By using the Turnaround platform, you confirm that you are authorized by your organization and agree to use the service lawfully. Turnaround provides fleet operations, trip coordination, GPS and geofence monitoring, dwell analysis, gate-pass management, notifications, reporting, and operational intelligence.</p>
    <p className="mt-5">You are responsible for accurate data, required permissions and notices for drivers and vehicles, account security, safe operating procedures, and reviewing automated alerts, predictions, routes, and cost estimates before acting on them. The platform does not replace professional judgment, customs advice, legal compliance, emergency services, or safety procedures.</p>
    <p className="mt-5">Do not misuse the service, access another account, bypass security, upload harmful code, or submit unlawful or unrelated content. You retain rights in your submitted data and grant Turnaround the limited rights needed to operate and secure the service.</p>
    <p className="mt-5">The service is provided on an available basis and may be affected by connectivity, maintenance, telematics, mapping, authentication, or other third-party services. Terms may be updated by publishing a revised version. Continued use after the effective date constitutes acceptance where permitted by law.</p>
  </LegalDocumentPage>
);
