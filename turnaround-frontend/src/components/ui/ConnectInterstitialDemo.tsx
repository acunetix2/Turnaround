import { Button } from './Button'
import {
  AccountRow,
  InterstitialShell,
  LogoPair,
  SignOutButton,
  StripeLogo,
  SupabaseLogo,
} from './connect-interstitial-shared'

export function ConnectInterstitialDemo() {
  return (
    <div className="flex items-center justify-center p-6 bg-bg-surface-raised/20">
      <InterstitialShell
        logo={<LogoPair left={<StripeLogo />} right={<SupabaseLogo />} />}
        title="Authorize Stripe Projects"
        description="This will create an organization on your behalf in Supabase"
      >
        <div className="flex flex-col gap-3">
          <AccountRow displayName="alex@example.com" action={<SignOutButton />} />
          <Button variant="primary" block>
            Authorize Stripe Projects
          </Button>
          <Button variant="ghost" block>
            Cancel
          </Button>
        </div>
      </InterstitialShell>
    </div>
  )
}
