import React, { useState } from 'react';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  sendResetEmail,
  sendVerificationEmail,
} from '../firebase';
import { exchangeSessionCookie } from '../lib/apiClient';
import { validatePassword } from '../lib/passwordPolicy';
import { getFriendlyError } from '../lib/friendlyError';
import {
  ShieldCheck,
  Globe,
  CircleNotch as Loader2,
  ArrowRight,
  Sparkle as Sparkles,
  EnvelopeSimple as MailCheck,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import BrandIcon from './BrandIcon';

/** localStorage key for the "Remember email" checkbox (Phase A). */
const REMEMBER_EMAIL_KEY = 'creatoros:remember-email';

/**
 * Enumeration-SAFE password-reset copy. Shown for EVERY reset attempt that
 * reaches the auth backend — even when Firebase (older configs) throws
 * auth/user-not-found — so a bad actor can't discover which emails exist.
 */
const GENERIC_RESET_COPY =
  'If an account exists for that email, a password reset link is on its way. Check your inbox (and spam folder).';

type AuthView = 'signin' | 'register' | 'reset';

function readRememberedEmail(): string {
  try {
    return localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

export default function Login({ navigate }: { navigate?: (path: string) => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<AuthView>('signin');
  const [email, setEmail] = useState(readRememberedEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(() => readRememberedEmail() !== '');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const switchView = (next: AuthView) => {
    setView(next);
    setError('');
    setInfo('');
    setPassword('');
    setConfirmPassword('');
  };

  /**
   * Best-effort: mint the hardening session cookie (Phase A). The Bearer flow
   * keeps working when this fails (e.g. offline), so it never blocks sign-in.
   */
  const mintSessionCookie = () => {
    exchangeSessionCookie().catch((err) => {
      console.warn('Session cookie exchange skipped:', err);
    });
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await loginWithGoogle();
      if (res?.user) {
        mintSessionCookie();
        navigate?.('/dashboard');
      }
    } catch (error: any) {
      console.error('Google Login failed:', error);
      setError(getFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    // Password reset is its own branch: it never needs a password field.
    if (view === 'reset') {
      setIsLoading(true);
      setError('');
      try {
        await sendResetEmail(email);
      } catch (err: any) {
        console.error('Password reset request failed:', err);
        // auth/user-not-found MUST resolve to the same generic copy as success
        // (email enumeration protection). Other failures (offline, throttled)
        // surface a friendly error without confirming account existence.
        if (err?.code !== 'auth/user-not-found') {
          setError(getFriendlyError(err));
          setIsLoading(false);
          return;
        }
      }
      setInfo(GENERIC_RESET_COPY);
      setIsLoading(false);
      return;
    }

    if (view === 'register') {
      const policy = validatePassword(password);
      if (!policy.valid) {
        setError(policy.error || 'Please choose a stronger password.');
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords don't match. Re-enter both and try again.");
        return;
      }
    } else if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      if (view === 'register') {
        const credential = await registerWithEmail(email, password);
        // Soft email-verification nudge — never blocks the new user; the app
        // shows a dismissible banner until the address is verified.
        if (credential?.user) {
          sendVerificationEmail(credential.user).catch((err) => {
            console.warn('Verification email not sent:', err);
          });
        }
        mintSessionCookie();
        navigate?.('/dashboard');
      } else {
        await loginWithEmail(email, password);
        try {
          if (rememberEmail) {
            localStorage.setItem(REMEMBER_EMAIL_KEY, email);
          } else {
            localStorage.removeItem(REMEMBER_EMAIL_KEY);
          }
        } catch {
          /* storage unavailable (private mode) — remember-email just no-ops */
        }
        mintSessionCookie();
        navigate?.('/dashboard');
      }
    } catch (err: any) {
      console.error('Auth failed:', err);
      setError(getFriendlyError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const headings: Record<AuthView, { title: string; subtitle: string }> = {
    signin: { title: 'Welcome Back', subtitle: 'Sign in to access your workspace' },
    register: { title: 'Create an Account', subtitle: 'Sign up to build your brand' },
    reset: { title: 'Reset Your Password', subtitle: "We'll email you a secure reset link" },
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col sm:flex-row overflow-y-auto overflow-x-hidden">
      {/* Left Pane - Branding & Value Prop */}
      <div className="hidden sm:flex sm:w-1/2 relative flex-col justify-between p-8 xl:p-20 border-r border-[var(--separator)] overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[var(--accent)]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[var(--system-green)]/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10">
          <div
            className="flex items-center gap-3 mb-16 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate && navigate('/')}
          >
            <BrandIcon size={32} strokeWidth={1.5} className="text-[var(--accent)]" />
            <span className="text-[24px] font-bold tracking-tight">CreatorOS</span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="font-serif text-[44px] xl:text-[54px] font-semibold tracking-[-0.015em] leading-tight mb-6">
              The OS for Modern Creators.
            </h1>
            <p className="text-[20px] text-[var(--label-secondary)] leading-relaxed max-w-xl mb-12 font-medium">
              Automate your workflow, generate high-quality content, and scale your audience with
              AI.
            </p>
            <div className="flex flex-col gap-6">
              <FeatureItem
                icon={Sparkles}
                title="AI-Powered Workflow"
                desc="Generate scripts & hooks in seconds."
              />
              <FeatureItem
                icon={Globe}
                title="Audience Insights"
                desc="Understand your niche and track growth."
              />
              <FeatureItem
                icon={ShieldCheck}
                title="Built for Security"
                desc="Your brand is safe in the cloud."
              />
            </div>
          </motion.div>
        </div>
        <div className="relative z-10 flex items-center gap-4 text-[var(--label-tertiary)] text-[13px] font-bold uppercase tracking-widest">
          <span>Trusted by 50K Creators</span>
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--separator)]" />
          <span>Join the Club</span>
        </div>
      </div>

      {/* Right Pane - Login Form */}
      <div className="w-full sm:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-[var(--bg-secondary)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full relative z-10"
        >
          <div className="ios-card bg-[var(--bg-tertiary)] p-8 sm:p-12 ios-elevated text-center border-t border-[var(--separator)]">
            <div className="sm:hidden mb-10">
              <div
                className="w-20 h-20 bg-[var(--bg-secondary)] rounded-[22px] flex items-center justify-center mx-auto mb-6 border border-[var(--separator)] shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate && navigate('/')}
              >
                <BrandIcon size={40} strokeWidth={1.5} className="text-[var(--accent)]" />
              </div>
              <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] mb-1">
                CreatorOS
              </h1>
              <p className="text-[17px] text-[var(--label-secondary)] font-medium">
                Your AI Creator Workspace
              </p>
            </div>

            <div className="hidden sm:block mb-8">
              <h2 className="font-serif text-[30px] font-semibold tracking-[-0.015em] mb-1">
                {headings[view].title}
              </h2>
              <p className="text-[17px] text-[var(--label-secondary)] font-medium">
                {headings[view].subtitle}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">
                {error}
              </div>
            )}

            {info && (
              <div
                className="mb-6 p-3 bg-[var(--system-green)]/10 border border-[var(--system-green)]/20 text-[var(--system-green)] rounded-xl text-sm flex items-start gap-2 text-left"
                data-testid="auth-info-box"
              >
                <MailCheck size={18} strokeWidth={1.5} className="shrink-0 mt-0.5" />
                <span>{info}</span>
              </div>
            )}

            {view === 'reset' && info ? (
              /* Enumeration-safe reset confirmation replaces the form entirely. */
              <div className="space-y-6 mb-6">
                <button
                  type="button"
                  onClick={() => switchView('signin')}
                  className="ios-button ios-button-filled w-full py-4 text-[17px]"
                  data-testid="back-to-signin"
                >
                  <span>Back to Sign In</span>
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                  <div>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="ios-input w-full px-4 py-3 bg-[var(--bg-secondary)]"
                      disabled={isLoading}
                      autoComplete="email"
                      required
                    />
                  </div>
                  {view !== 'reset' && (
                    <div>
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="ios-input w-full px-4 py-3 bg-[var(--bg-secondary)]"
                        disabled={isLoading}
                        autoComplete={view === 'register' ? 'new-password' : 'current-password'}
                        required
                      />
                    </div>
                  )}
                  {view === 'register' && (
                    <div>
                      <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="ios-input w-full px-4 py-3 bg-[var(--bg-secondary)]"
                        disabled={isLoading}
                        autoComplete="new-password"
                        required
                      />
                      <p className="mt-2 text-[12px] text-[var(--label-tertiary)] text-left leading-relaxed">
                        At least 8 characters, and not a commonly used password.
                      </p>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="ios-button bg-[var(--label-primary)] text-[var(--bg-primary)] w-full py-4 text-[17px] group flex justify-center"
                  >
                    {isLoading ? (
                      <Loader2 size={24} strokeWidth={1.5} className="animate-spin" />
                    ) : (
                      <span>
                        {view === 'register'
                          ? 'Sign Up'
                          : view === 'reset'
                            ? 'Send Reset Link'
                            : 'Sign In'}
                      </span>
                    )}
                  </button>
                </form>

                {view === 'signin' && (
                  <div className="flex items-center justify-between mb-6 -mt-2">
                    <label
                      className="flex items-center gap-2 text-[13px] text-[var(--label-secondary)] font-medium cursor-pointer select-none"
                      data-testid="remember-email"
                    >
                      <input
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(e) => setRememberEmail(e.target.checked)}
                        className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
                      />
                      Remember email
                    </label>
                    <button
                      type="button"
                      onClick={() => switchView('reset')}
                      className="text-[13px] text-[var(--accent)] font-semibold hover:underline"
                      data-testid="forgot-password-link"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {view !== 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchView('signin')}
                    className="text-[13px] text-[var(--label-secondary)] font-medium hover:text-[var(--accent)] transition-colors mb-6"
                    data-testid="back-to-signin-link"
                  >
                    ← Back to sign in
                  </button>
                )}
              </>
            )}

            {view === 'signin' && (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-[var(--separator)]"></div>
                  <span className="text-[13px] text-[var(--label-tertiary)] uppercase tracking-wider font-semibold">
                    Or
                  </span>
                  <div className="flex-1 h-px bg-[var(--separator)]"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="ios-button ios-button-filled w-full py-4 text-[17px] group"
                >
                  {isLoading ? (
                    <Loader2 size={24} strokeWidth={1.5} className="animate-spin" />
                  ) : (
                    <>
                      <img
                        src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png"
                        alt="Google"
                        className="w-6 h-6"
                        referrerPolicy="no-referrer"
                      />
                      <span>Continue with Google</span>
                      <ArrowRight
                        size={20}
                        strokeWidth={1.5}
                        className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                      />
                    </>
                  )}
                </button>
              </>
            )}

            <div className="mt-8 text-sm text-[var(--label-secondary)]">
              {view === 'register'
                ? 'Already have an account?'
                : view === 'reset'
                  ? 'Remembered it after all?'
                  : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => switchView(view === 'register' ? 'signin' : 'register')}
                className="text-[var(--accent)] font-semibold hover:underline"
                data-testid="auth-view-toggle"
              >
                {view === 'register' ? 'Sign In' : 'Sign Up'}
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-[var(--separator)]">
              <p className="text-[12px] text-[var(--label-tertiary)] leading-relaxed font-medium">
                By continuing, you agree to our{' '}
                <a
                  href="/terms"
                  className="text-[var(--label-secondary)] hover:text-[var(--accent)] underline underline-offset-4 transition-colors"
                >
                  Terms
                </a>{' '}
                and{' '}
                <a
                  href="/privacy"
                  className="text-[var(--label-secondary)] hover:text-[var(--accent)] underline underline-offset-4 transition-colors"
                >
                  Privacy
                </a>
                .
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center border border-[var(--separator)] shrink-0 shadow-sm">
        <Icon size={24} strokeWidth={1.5} className="text-[var(--accent)]" />
      </div>
      <div>
        <h3 className="font-bold text-[17px] mb-0.5">{title}</h3>
        <p className="text-[15px] text-[var(--label-secondary)] leading-snug">{desc}</p>
      </div>
    </div>
  );
}
