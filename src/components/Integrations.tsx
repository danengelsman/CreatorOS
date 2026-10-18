import React, { useState, useEffect } from 'react';
import { YoutubeLogo as Youtube, MusicNotes, InstagramLogo, TwitterLogo, CheckCircle as CheckCircle2, WarningCircle as AlertCircle } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { authorizedFetch } from '../firebase';
import { cn } from '../lib/utils';

interface ConnectedAccount {
  platform: string;
  profile: any;
}

export default function Integrations() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
    
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchAccounts();
        setConnecting(null);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await authorizedFetch('/api/accounts');
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    // Environment variables are handled on the server
    setConnecting(platform);
    try {
      const { url } = await authorizedFetch(`/api/auth/${platform === 'youtube' ? 'google' : 'tiktok'}/url`);
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        url,
        `connect_${platform}`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        alert('Popup blocked. Please allow popups to connect your account.');
        setConnecting(null);
      }
    } catch (error) {
      console.error(`Failed to connect ${platform}:`, error);
      setConnecting(null);
    }
  };

  const isConnected = (platform: string) => accounts.some(a => a.platform === platform);
  const getAccount = (platform: string) => accounts.find(a => a.platform === platform);

  // Honesty sweep (D4-A): descriptions state what each integration really
  // does today. Instagram/X have no OAuth wiring — they are labeled coming
  // soon instead of offering Connect buttons that would start the TikTok flow.
  // The old "track anonymously" handle input was removed: it saved nothing
  // (client state only) while implying real tracking.
  const platforms = [
    {
      id: 'youtube',
      name: 'YouTube',
      icon: Youtube,
      color: 'text-[#FF0000]',
      description: 'Connect your channel to sync real statistics: views, subscribers, and videos.',
      scopes: ['Read Analytics', 'View Channel Statistics'],
      live: true
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: MusicNotes,
      color: 'text-zinc-900 dark:text-white',
      description: 'Connect your TikTok account for display. Analytics are unavailable — TikTok requires audit approval for data access.',
      scopes: ['View Profile'],
      live: true,
      analyticsPending: true
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: InstagramLogo,
      color: 'text-[#E1306C]',
      description: 'Not connected yet. Instagram integration is planned.',
      scopes: [],
      comingSoon: true
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: TwitterLogo,
      color: 'text-zinc-900 dark:text-white',
      description: 'Not connected yet. X (Twitter) integration is planned.',
      scopes: [],
      comingSoon: true
    }
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-[28px] font-semibold tracking-[-0.015em]">Integrations</h2>
          <p className="text-sm text-[var(--label-secondary)]">Connect YouTube and TikTok to link your accounts.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {platforms.map((platform) => {
          const connected = isConnected(platform.id);
          const isVerified = accounts.some(a => a.platform === platform.id);
          const account = getAccount(platform.id);
          const isBusy = connecting === platform.id;

          return (
            <motion.div
              key={platform.id}
              layout
              className={cn(
                "ios-card p-5 flex flex-col gap-6 transition-all duration-300",
                connected ? "bg-[var(--bg-tertiary)]" : "bg-[var(--bg-secondary)]"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5",
                    platform.color
                  )}>
                    <platform.icon className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[17px]">{platform.name}</h3>
                      {connected && (
                        <span className={cn(
                          "flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full",
                          isVerified ? "text-emerald-500 bg-emerald-500/10" : "text-blue-500 bg-blue-500/10"
                        )}>
                          <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
                          {isVerified ? 'Verified' : 'Passive Tracking'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--label-secondary)] max-w-md">
                      {platform.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {platform.comingSoon ? (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-[var(--label-secondary)] bg-[var(--bg-tertiary)] border border-[var(--separator)]">
                      Coming Soon
                    </span>
                  ) : !connected ? (
                    <button
                      onClick={() => handleConnect(platform.id)}
                      disabled={isBusy}
                      className="ios-button ios-button-tinted h-10 px-4 text-xs"
                    >
                      Connect {platform.name}
                    </button>
                  ) : !isVerified && (
                    <button
                      onClick={() => handleConnect(platform.id)}
                      disabled={isBusy}
                      className="ios-button ios-button-tinted h-10 px-4 text-xs cursor-pointer"
                    >
                      Connect {platform.name}
                    </button>
                  )}
                  {isVerified && (
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] overflow-hidden border border-white/5">
                      <img loading="lazy"
                        src={account?.profile?.picture || `https://ui-avatars.com/api/?name=${platform.name}` || undefined}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {platform.analyticsPending && (
                <div className="pt-3 border-t border-[var(--separator)] flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[var(--label-secondary)]">
                    TikTok analytics unavailable — TikTok requires audit approval for data access.
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
