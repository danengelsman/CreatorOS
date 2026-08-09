import React, { useState, useEffect } from 'react';
import { YoutubeLogo as Youtube, MusicNotes, InstagramLogo, TwitterLogo, ArrowSquareOut as ExternalLink, CheckCircle as CheckCircle2, WarningCircle as AlertCircle, ArrowsClockwise as RefreshCw, Plus } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { authorizedFetch } from '../firebase';
import { cn } from '../lib/utils';

interface ConnectedAccount {
  platform: string;
  profile: any;
}

export default function Integrations() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [handles, setHandles] = useState<{ [key: string]: string }>({});
  const [handleInput, setHandleInput] = useState<{ [key: string]: string }>({});

  const isConnected = (platform: string) => accounts.some(a => a.platform === platform) || handles[platform];
  const getAccount = (platform: string) => accounts.find(a => a.platform === platform);

  const handleSoftConnect = (platform: string) => {
    const handle = handleInput[platform];
    if (!handle) return;
    setHandles(prev => ({ ...prev, [platform]: handle }));
    // In a real app, we'd save this to the DB
  };

  const platforms = [
    {
      id: 'youtube',
      name: 'YouTube',
      icon: Youtube,
      color: 'text-[#FF0000]',
      description: 'Fetch channel statistics, views, and subscriber growth.',
      scopes: ['Read Analytics', 'View Channel Statistics']
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: MusicNotes,
      color: 'text-zinc-900 dark:text-white',
      description: 'Monitor video performance and audience engagement.',
      scopes: ['View Profile', 'Video Analytics']
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: InstagramLogo,
      color: 'text-[#E1306C]',
      description: 'Track Reels performance and follower growth.',
      scopes: ['Read Insights', 'View Profile']
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: TwitterLogo,
      color: 'text-zinc-900 dark:text-white',
      description: 'Monitor post reach and engagement metrics.',
      scopes: ['Read Analytics', 'View Profile']
    }
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-[28px] font-semibold tracking-[-0.015em]">Integrations</h2>
          <p className="text-sm text-[var(--label-secondary)]">Connect your platforms to sync real-time analytics.</p>
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
                  {!connected ? (
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
                      <img 
                        src={account?.profile?.picture || `https://ui-avatars.com/api/?name=${platform.name}`} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {!connected && (
                <div className="pt-4 border-t border-[var(--separator)] flex flex-col gap-3">
                  <p className="text-[11px] font-bold text-[var(--label-tertiary)] uppercase tracking-widest">Or track anonymously (Newbie Friendly)</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--label-tertiary)] font-bold">@</span>
                      <input 
                        type="text"
                        placeholder="your_handle"
                        value={handleInput[platform.id] || ''}
                        onChange={(e) => setHandleInput(prev => ({ ...prev, [platform.id]: e.target.value }))}
                        className="w-full pl-7 pr-4 py-2 bg-[var(--bg-primary)] text-sm rounded-xl outline-none border border-transparent focus:border-[var(--accent)] transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => handleSoftConnect(platform.id)}
                      className="ios-button ios-button-gray p-2"
                    >
                      Track Handle
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
