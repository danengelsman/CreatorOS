import React from 'react';
import { Plus, Search, RefreshCw, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarBlock } from './calendarTypes';
import { getPlatformStyle, getPlatformIcon } from './calendarHelpers';

interface UnscheduledSidebarProps {
  isLoading: boolean;
  sidebarSearch: string;
  setSidebarSearch: (search: string) => void;
  filteredUnscheduled: CalendarBlock[];
  onOpenNewEvent: () => void;
  onSelectEvent: (block: CalendarBlock) => void;
  onDeleteEvent: (id: string, e: React.MouseEvent) => void;
}

export default function UnscheduledSidebar({
  isLoading,
  sidebarSearch,
  setSidebarSearch,
  filteredUnscheduled,
  onOpenNewEvent,
  onSelectEvent,
  onDeleteEvent,
}: UnscheduledSidebarProps) {
  return (
    <div className="lg:col-span-3 bg-[var(--bg-tertiary)] border border-[var(--separator)]/60 rounded-[24px] p-5 flex flex-col h-full max-h-[850px]">
      <div className="space-y-4 pb-4 border-b border-[var(--separator)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[17px] font-bold tracking-tight text-[var(--label-primary)]">
              Unscheduled Content
            </h3>
            <p className="text-[12px] text-[var(--label-secondary)] font-medium mt-0.5">
              Drag blocks onto calendar dates
            </p>
          </div>
          <button
            onClick={onOpenNewEvent}
            className="p-1.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
            title="Add Unscheduled Block"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-[var(--label-tertiary)] w-4 h-4" />
          <input
            type="text"
            placeholder="Search drafts..."
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--separator)]/40 rounded-xl pl-9 pr-4 py-2.5 text-[13px] outline-none focus:border-[var(--accent)] transition-colors text-[var(--label-primary)]"
          />
        </div>
      </div>

      {/* Draggable blocks list */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 mt-4 pr-1">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--label-secondary)]">
            <RefreshCw className="animate-spin text-[var(--accent)]" size={24} />
            <span className="text-[13px] font-medium">Loading content blocks...</span>
          </div>
        ) : filteredUnscheduled.length === 0 ? (
          <div className="py-20 text-center text-[var(--label-tertiary)] text-[13px] font-medium flex flex-col items-center gap-2">
            <CalendarIcon size={24} className="opacity-40" />
            <span>No unscheduled drafts.</span>
            <p className="text-[11px] px-4">
              Create content in the Editor or click (+) above to build ideas.
            </p>
          </div>
        ) : (
          filteredUnscheduled.map((block) => {
            const style = getPlatformStyle(block.platform || block.data?.platform);
            const title = block.name || block.data?.title || 'Draft Content';
            const body = block.data?.body || '';
            const score = block.data?.score || 0;

            return (
              <div
                key={block.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('blockId', block.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => onSelectEvent(block)}
                className={cn(
                  'p-3.5 rounded-2xl border cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] bg-[var(--bg-secondary)] group flex flex-col gap-2 shadow-sm hover:shadow-md',
                  style.border,
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                      style.bg,
                      style.text,
                    )}
                  >
                    {style.name}
                  </span>
                  {score > 0 && (
                    <span className="text-[10px] font-bold text-[var(--system-green)] bg-green-500/10 px-2 py-0.5 rounded-full">
                      Score: {score}
                    </span>
                  )}
                </div>
                <h4 className="text-[13px] font-bold text-[var(--label-primary)] truncate">
                  {title}
                </h4>
                {body && (
                  <p className="text-[11px] text-[var(--label-secondary)] line-clamp-2 leading-relaxed font-medium">
                    {body}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-[var(--separator)]/30 text-[10px] text-[var(--label-tertiary)] font-bold">
                  <span className="flex items-center gap-1">
                    {getPlatformIcon(block.platform || block.data?.platform, 12)}
                    Hold & Drag
                  </span>
                  <button
                    onClick={(e) => onDeleteEvent(block.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-red-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
