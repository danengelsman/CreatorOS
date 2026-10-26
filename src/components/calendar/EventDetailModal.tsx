import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import {
  X,
  CheckCircle,
  Clock,
  CloudUpload,
  ExternalLink,
  Check,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarBlock, ConnectedAccount, ReformatSuggestion } from './calendarTypes';
import { getPlatformStyle, getPlatformIcon, isAutoPublished } from './calendarHelpers';

interface EventDetailModalProps {
  showDetailModal: boolean;
  selectedEvent: CalendarBlock | null;
  connectedAccounts: ConnectedAccount[];
  selectedSyncPlatforms: string[];
  setSelectedSyncPlatforms: React.Dispatch<React.SetStateAction<string[]>>;
  isSyncing: boolean;
  syncError: string;
  syncResults: any;
  selectedTargetPlatforms: string[];
  setSelectedTargetPlatforms: (platforms: string[]) => void;
  isGeneratingReformat: boolean;
  reformatError: string;
  reformatSuggestions: ReformatSuggestion[];
  onClose: () => void;
  onSyncToPlatforms: () => void;
  onGenerateAIReformat: () => void;
  onSaveAIBlock: (suggestion: ReformatSuggestion) => void;
  onDeleteEvent: (id: string) => void;
  onUnschedule: (event: CalendarBlock) => void;
  onGoToProfile: () => void;
}

export default function EventDetailModal({
  showDetailModal,
  selectedEvent,
  connectedAccounts,
  selectedSyncPlatforms,
  setSelectedSyncPlatforms,
  isSyncing,
  syncError,
  syncResults,
  selectedTargetPlatforms,
  setSelectedTargetPlatforms,
  isGeneratingReformat,
  reformatError,
  reformatSuggestions,
  onClose,
  onSyncToPlatforms,
  onGenerateAIReformat,
  onSaveAIBlock,
  onDeleteEvent,
  onUnschedule,
  onGoToProfile,
}: EventDetailModalProps) {
  if (!showDetailModal || !selectedEvent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-tertiary)] w-full max-w-2xl rounded-[28px] shadow-2xl border border-[var(--separator)] overflow-hidden my-8"
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--separator)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full',
                getPlatformStyle(selectedEvent.platform || selectedEvent.data?.platform).bg,
                getPlatformStyle(selectedEvent.platform || selectedEvent.data?.platform).text,
              )}
            >
              {getPlatformStyle(selectedEvent.platform || selectedEvent.data?.platform).name}
            </span>
            <span className="text-[13px] text-[var(--label-secondary)] font-bold">
              {selectedEvent.scheduledDate
                ? `Scheduled on ${format(selectedEvent.scheduledDate, 'MMMM d, yyyy')} at ${selectedEvent.publishTime || '12:00'}`
                : 'Unscheduled Draft'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--label-tertiary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Content Pane */}
        <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto no-scrollbar">
          <div className="space-y-2">
            <h3 className="text-[20px] font-bold text-[var(--label-primary)]">
              {selectedEvent.name || selectedEvent.data?.title || 'Untitled Content'}
            </h3>
            {(selectedEvent.data?.body || selectedEvent.body) && (
              <div className="bg-[var(--bg-secondary)]/50 border border-[var(--separator)]/40 p-4 rounded-2xl">
                <p className="text-[14px] text-[var(--label-primary)] leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedEvent.data?.body || selectedEvent.body}
                </p>
              </div>
            )}
          </div>

          {/* Auto Publish Status Indicators */}
          {selectedEvent.scheduledDate && (
            <div className="p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/30 border border-[var(--separator)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                  {isAutoPublished(selectedEvent) ? <CheckCircle size={20} /> : <Clock size={20} />}
                </div>
                <div>
                  <span className="text-[13px] font-bold text-[var(--label-primary)] block">
                    {isAutoPublished(selectedEvent)
                      ? 'Successfully Auto-Published'
                      : 'Linked to Auto-Publish'}
                  </span>
                  <p className="text-[11px] text-[var(--label-secondary)] font-medium leading-tight mt-0.5">
                    {isAutoPublished(selectedEvent)
                      ? `Content went live automatically on ${getPlatformStyle(selectedEvent.platform || selectedEvent.data?.platform).name}.`
                      : `Automatic API integration triggers on ${format(selectedEvent.scheduledDate, 'MMM d, yyyy')} at ${selectedEvent.publishTime || '12:00'}.`}
                  </p>
                </div>
              </div>
              {isAutoPublished(selectedEvent) && (
                <span className="text-[11px] font-bold text-green-500 uppercase tracking-wider bg-green-500/10 px-2.5 py-1 rounded-full">
                  Live
                </span>
              )}
            </div>
          )}

          {/* Sync to Platforms Section */}
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
                <div className="bg-[var(--bg-secondary)] border border-[var(--separator)]/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
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
                    onClick={onSyncToPlatforms}
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

          {/* AI Reformatting Section */}
          <div className="border-t border-[var(--separator)]/60 pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--accent)]" />
              <h4 className="text-[15px] font-bold text-[var(--label-primary)]">
                Reformat for Multiple Platforms with AI
              </h4>
            </div>
            <p className="text-[12px] text-[var(--label-secondary)] font-medium leading-relaxed">
              Instantly rewrite and format this content block into separate native drafts for your
              other social channels using Gemini.
            </p>

            {/* Platforms selection toggles */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              {['youtube', 'tiktok', 'instagram', 'twitter'].map((p) => {
                const isCurrent = (selectedEvent.platform || selectedEvent.data?.platform) === p;
                const isSelected = selectedTargetPlatforms.includes(p);
                const config = getPlatformStyle(p);

                if (isCurrent) return null; // Can't reformat to its own platform

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTargetPlatforms(
                          selectedTargetPlatforms.filter((item) => item !== p),
                        );
                      } else {
                        setSelectedTargetPlatforms([...selectedTargetPlatforms, p]);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-[13px] font-semibold transition-all',
                      isSelected
                        ? `${config.bg} ${config.border} ${config.text} scale-[1.03]`
                        : 'border-[var(--separator)]/40 hover:bg-[var(--bg-secondary)] text-[var(--label-secondary)]',
                    )}
                  >
                    {getPlatformIcon(p, 14)}
                    {config.name}
                  </button>
                );
              })}
            </div>

            {/* Generate Button */}
            <button
              onClick={onGenerateAIReformat}
              disabled={selectedTargetPlatforms.length === 0 || isGeneratingReformat}
              className="w-full py-3.5 rounded-xl bg-[var(--accent)] text-white text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
            >
              {isGeneratingReformat ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Sparkles size={15} />
              )}
              Generate Cross-Platform Reformatted Drafts
            </button>

            {/* AI Generating Skeletons */}
            {isGeneratingReformat && (
              <div className="space-y-3 pt-3">
                <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl animate-pulse space-y-2">
                  <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4" />
                  <div className="h-3 bg-[var(--bg-tertiary)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
                </div>
              </div>
            )}

            {/* Error Indicator */}
            {reformatError && (
              <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 text-[13px] font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                {reformatError}
              </div>
            )}

            {/* Suggestions Display */}
            {reformatSuggestions.length > 0 && (
              <div className="space-y-4 pt-3 border-t border-[var(--separator)]/40">
                <h5 className="text-[13px] font-bold text-[var(--label-primary)] uppercase tracking-widest px-1">
                  Gemini Proposed Drafts
                </h5>
                <div className="space-y-4">
                  {reformatSuggestions.map((s, idx) => {
                    const config = getPlatformStyle(s.platform);
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'p-4 rounded-2xl border bg-[var(--bg-secondary)]/30 flex flex-col gap-2.5',
                          config.border,
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                              config.bg,
                              config.text,
                            )}
                          >
                            {config.name} Draft
                          </span>
                          <button
                            onClick={() => onSaveAIBlock(s)}
                            className="text-[12px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
                          >
                            <Plus size={14} /> Save Draft
                          </button>
                        </div>
                        <h6 className="text-[13px] font-bold text-[var(--label-primary)]">
                          {s.title}
                        </h6>
                        <p className="text-[12px] text-[var(--label-secondary)] whitespace-pre-wrap leading-relaxed font-medium">
                          {s.body}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-[var(--bg-secondary)]/40 border-t border-[var(--separator)] flex flex-wrap gap-3 items-center justify-between">
          <button
            onClick={() => onDeleteEvent(selectedEvent.id)}
            className="px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[13px] font-bold transition-colors flex items-center gap-2"
          >
            <Trash2 size={15} /> Delete Block
          </button>

          <div className="flex items-center gap-2">
            {selectedEvent.scheduledDate && (
              <button
                onClick={() => onUnschedule(selectedEvent)}
                className="px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--separator)]/60 text-[var(--label-secondary)] hover:text-[var(--label-primary)] text-[13px] font-bold transition-colors"
              >
                Unschedule Draft
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-[var(--accent)] text-white text-[13px] font-bold hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
