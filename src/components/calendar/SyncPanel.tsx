import React, { useState, useEffect } from 'react';
import { auth, db, authorizedFetch, serverTimestamp } from '../../firebase';
import { doc } from 'firebase/firestore';
import { updateOwnedContentProject, STUDIO_JOURNEY_UNAVAILABLE } from '../studio/studioOwnerFence';
import { getFriendlyError } from '../../lib/friendlyError';
import { ConnectedAccount, CalendarBlock } from './calendarTypes';
import { getPlatformStyle, getPlatformIcon } from './calendarHelpers';
import { cn } from '@/lib/utils';
import {
  CloudUpload,
  ExternalLink,
  Check,
  CheckCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface SyncPanelProps {
  user: any;
  selectedEvent: CalendarBlock | null;
  onGoToProfile: () => void;
  onPublished: () => void;
}

/**
 * F5.4: extracted instant-sync panel.
 * Owns connectedAccounts/isSyncing/syncResults/syncError/selectedSyncPlatforms +
 * fetchConnectedAccounts/handleSyncToPlatforms, including the owner guard and
 * Firebase write. Renders the sync UI previously inline in EventDetailModal.
 */
export default function SyncPanel({
  user,
  selectedEvent,
  onGoToProfile,
  onPublished,
}: SyncPanelProps) {
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [syncError, setSyncError] = useState('');
  const [selectedSyncPlatforms, setSelectedSyncPlatforms] = useState<string[]>([]);

  const fetchConnectedAccounts = async () => {
    if (!user) return;
    try {
      const accounts = await authorizedFetch('/api/accounts');
      setConnectedAccounts(accounts || []);
    } catch (error) {
      console.error('Failed to fetch connected accounts:', error);
    }
  };

  const handleSyncToPlatforms = async () => {
    if (
      !user?.uid ||
      !selectedEvent ||
      selectedEvent.userId !== user.uid ||
      selectedSyncPlatforms.length === 0
    )
      return;
    const owner = { uid: user.uid, isCurrent: () => auth.currentUser?.uid === user.uid };
    if (!owner.isCurrent()) return;
    setIsSyncing(true);
    setSyncResults(null);
    setSyncError('');

    const originalTitle = selectedEvent.name || selectedEvent.data?.title || 'Draft Content';
    const originalBody = selectedEvent.data?.body || selectedEvent.body || '';

    try {
      const result = await authorizedFetch(
        '/api/publish',
        {
          method: 'POST',
          credentials: 'omit',
          body: JSON.stringify({
            title: originalTitle,
            body: originalBody,
            platforms: selectedSyncPlatforms,
          }),
        },
        owner,
      );
      if (!owner.isCurrent()) throw new Error('Account changed');

      if (result.success) {
        setSyncResults(result.results);

        const hasSuccess = Object.values(result.results).some((r: any) => r.status === 'success');
        if (hasSuccess) {
          await updateOwnedContentProject(
            db,
            doc(db, 'projects', selectedEvent.id),
            owner.uid,
            {
              status: 'Published',
              updatedAt: serverTimestamp(),
            },
            owner.isCurrent,
          );
          if (!owner.isCurrent()) throw new Error('Account changed');

          onPublished();
        }
      } else {
        throw new Error(result.error || 'Failed to sync content');
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(
        err instanceof Error && err.message === STUDIO_JOURNEY_UNAVAILABLE
          ? `${err.message} Publishing may already have succeeded; check the destination before publishing again.`
          : getFriendlyError(err),
      );
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConnectedAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedEvent) {
      setSyncResults(null);
      setSyncError('');
      const currentPlatform = (
        selectedEvent.platform ||
        selectedEvent.data?.platform ||
        ''
      ).toLowerCase();
      const isConnected = connectedAccounts.some((acc) => acc.platform === currentPlatform);
      setSelectedSyncPlatforms(isConnected ? [currentPlatform] : []);
    }
  }, [selectedEvent, connectedAccounts]);

  if (!selectedEvent) return null;

  return (
    <div className="border-t border-[var(--separator)]/60 pt-6 space-y-4">
      <div className="flex items-center gap-2">
        <CloudUpload size={18} className="text-[var(--accent)]" />
        <h4 className="text-[15px] font-bold text-[var(--label-primary)]">
          Push and Sync to Connected Social Networks
        </h4>
      </div>
      <p className="text-[12px] text-[var(--label-secondary)] font-medium leading-relaxed">
        Instantly push this scheduled content block to your connected social channels via
        OAuth.
      </p>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          {['youtube', 'tiktok', 'instagram', 'twitter'].map((p) => {
            const style = getPlatformStyle(p);
            const isConnected = connectedAccounts.some((acc) => acc.platform === p);
            const isSelected = selectedSyncPlatforms.includes(p);
            const accountInfo = connectedAccounts.find((acc) => acc.platform === p);

            return (
              <div
                key={p}
                className={cn(
                  'relative flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200',
                  isConnected
                    ? 'bg-[var(--bg-secondary)] border-[var(--separator)] cursor-pointer hover:border-[var(--accent)]'
                    : 'bg-[var(--bg-tertiary)]/50 border-[var(--separator)]/30 opacity-75',
                )}
                onClick={() => {
                  if (!isConnected) return;
                  if (isSelected) {
                    setSelectedSyncPlatforms((prev) => prev.filter((item) => item !== p));
                  } else {
                    setSelectedSyncPlatforms((prev) => [...prev, p]);
                  }
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                      style.bg,
                      style.text,
                    )}
                  >
                    {getPlatformIcon(p, 16)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[12px] font-bold text-[var(--label-primary)] block truncate">
                      {style.name}
                    </span>
                    <span className="text-[10px] text-[var(--label-tertiary)] font-semibold block truncate">
                      {isConnected
                        ? `@${accountInfo?.profile?.name || accountInfo?.profile?.username || 'connected'}`
                        : 'Not connected'}
                    </span>
                  </div>
                </div>

                {isConnected ? (
                  <div
                    className={cn(
                      'w-5 h-5 rounded-md border flex items-center justify-center transition-colors shadow-sm',
                      isSelected
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'border-[var(--separator)] bg-[var(--bg-primary)] text-transparent',
                    )}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGoToProfile();
                    }}
                    className="text-[10px] font-bold text-[var(--accent)] hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    Connect <ExternalLink size={10} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {connectedAccounts.length === 0 ? (
          <div
            className="bg-[var(--bg-secondary)] border border-[var(--separator)]/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left"
          >
            <div className="space-y-1">
              <p className="text-[13px] font-bold text-[var(--label-primary)]">
                No connected channels detected
              </p>
              <p className="text-[11px] text-[var(--label-secondary)] font-medium leading-normal">
                Connect your social accounts via secure OAuth under your Profile tab to unlock
                instant publishing.
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToProfile}
              className="ios-button ios-button-tinted shrink-0 h-9 px-4 text-[13px] font-bold"
            >
              Go to Profile
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <button
              type="button"
              disabled={isSyncing || selectedSyncPlatforms.length === 0}
              onClick={handleSyncToPlatforms}
              className="w-full h-11 bg-[var(--accent)] text-white rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-[#007AFF1A] hover:bg-opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  <span>Synchronizing across platforms...</span>
                </>
              ) : (
                <>
                  <CloudUpload size={16} />
                  <span>Sync to Platforms ({selectedSyncPlatforms.length})</span>
                </>
              )}
            </button>

            {syncError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-start gap-2 text-[11px] font-medium leading-relaxed">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{syncError}</span>
              </div>
            )}

            {syncResults && (
              <div className="bg-[var(--bg-secondary)] border border-[var(--separator)]/40 rounded-xl p-3.5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-secondary)] block">
                  Sync Push Summary
                </span>
                <div className="space-y-2">
                  {Object.entries(syncResults).map(([plat, res]: [string, any]) => {
                    const style = getPlatformStyle(plat);
                    return (
                      <div
                        key={plat}
                        className="flex items-start justify-between gap-3 text-[12px] font-medium"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={cn(
                              'w-5 h-5 rounded flex items-center justify-center text-[10px]',
                              style.bg,
                              style.text,
                            )}
                          >
                            {getPlatformIcon(plat, 11)}
                          </div>
                          <span className="font-bold text-[var(--label-primary)]">
                            {style.name}
                          </span>
                        </div>
                        <div className="text-right min-w-0 shrink-0">
                          {res.status === 'success' ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-green-500 font-bold flex items-center gap-1">
                                <CheckCircle size={12} /> Live Sync Success
                              </span>
                              {res.url && (
                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-0.5 font-semibold"
                                >
                                  View Draft/Community <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-red-500 font-bold flex items-center gap-1">
                              <AlertCircle size={12} /> Failed: {res.message}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
