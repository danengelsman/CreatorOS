import { useState } from 'react';
import { ShieldCheck, X } from '@phosphor-icons/react';
import { sendVerificationEmail } from '@/firebase';

/**
 * Phase A — soft email-verification nudge (never a hard block).
 *
 * Rendered by LayoutShell for the workspace and by AppRoot during the
 * onboarding flow (where the router — and therefore LayoutShell — is not
 * mounted). Both instances share this one implementation.
 */
export default function VerificationBanner({ user }: { user: any }) {
  const [verificationSendState, setVerificationSendState] = useState<'idle' | 'sending' | 'sent'>(
    'idle',
  );
  const [verificationBannerDismissed, setVerificationBannerDismissed] = useState(false);

  const needsEmailVerification = Boolean(
    user &&
    !user.emailVerified &&
    (user.providerData?.[0]?.providerId ?? 'password') === 'password',
  );
  const showVerificationBanner =
    needsEmailVerification && !verificationBannerDismissed && verificationSendState !== 'sent';

  if (!showVerificationBanner) return null;

  const handleResendVerification = async () => {
    if (!user || verificationSendState === 'sending') return;
    setVerificationSendState('sending');
    try {
      await sendVerificationEmail(user);
      // Sent — collapse the banner (onAuthStateChanged refreshes emailVerified
      // after the user clicks the link and returns).
      setVerificationSendState('sent');
    } catch (error) {
      console.warn('Resend verification failed:', error);
      setVerificationSendState('idle');
    }
  };

  return (
    <div
      className="fixed lg:absolute top-[calc(env(safe-area-inset-top,0px)+52px)] left-0 right-0 z-[55] px-4 lg:px-10"
      data-testid="email-verification-banner"
    >
      <div className="max-w-[1400px] mx-auto mt-2 flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] ios-card">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--system-green) 12%, transparent)',
              color: 'var(--system-green)',
            }}
          >
            <ShieldCheck size={18} strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-medium text-[var(--label-secondary)] truncate">
            Verify your email address ({user?.email}) to secure your account.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResendVerification}
            disabled={verificationSendState === 'sending'}
            className="ios-button ios-button-tinted h-8 px-3 text-[13px]"
          >
            {verificationSendState === 'sending' ? 'Sending…' : 'Resend email'}
          </button>
          <button
            onClick={() => setVerificationBannerDismissed(true)}
            aria-label="Dismiss verification banner"
            className="p-2 text-[var(--label-tertiary)] hover:text-[var(--label-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
