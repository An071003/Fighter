import React, { useMemo } from 'react';
import { Compass, Layers, Search } from 'lucide-react';
import { CATEGORY_LABELS } from '@/domain/config';
import { listAllParts } from '@/domain/partRegistry';
import { selectCanSelectPart } from '@/domain/selectors';
import { useAppStore } from '@/domain/store';
import type { PartCategory } from '@/domain/types';

const CATEGORIES: Array<PartCategory | 'ALL'> = [
  'ALL',
  'CORE',
  'CANOPY',
  'SURFACE',
  'DUCT',
  'GEAR',
  'PANEL',
  'LIGHT',
];

export const PartsTree: React.FC = () => {
  const selectedPartId = useAppStore((s) => s.selectedPartId);
  const categoryFilter = useAppStore((s) => s.categoryFilter);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const dispatch = useAppStore((s) => s.dispatch);
  const startGuidedTour = useAppStore((s) => s.startGuidedTour);
  const canSelect = useAppStore(selectCanSelectPart);

  const allParts = useMemo(() => listAllParts(), []);

  const filteredParts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allParts.filter((part) => {
      if (categoryFilter !== 'ALL' && part.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        part.label.vi.toLowerCase().includes(q) ||
        part.label.en.toLowerCase().includes(q) ||
        part.id.toLowerCase().includes(q) ||
        part.nodeName.toLowerCase().includes(q)
      );
    });
  }, [allParts, categoryFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search + Tour Header */}
      <div className="p-3 border-b border-[#2D3B49] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E9F0F5]">
            <Layers className="w-4 h-4 text-[#67E5DF]" />
            <span>Cấu trúc 46 bộ phận ({filteredParts.length})</span>
          </div>
          <button
            type="button"
            data-testid="start-guided-tour"
            disabled={!canSelect}
            onClick={startGuidedTour}
            className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#17222E] hover:bg-[#67E5DF]/20 text-[#67E5DF] border border-[#67E5DF]/40 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Tour 8 cụm</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#95A5B3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm bộ phận (VD: Cánh trái, Càng đáp, Kính...)"
            aria-label="Tìm kiếm bộ phận 3D"
            data-testid="parts-search-input"
            className="w-full min-h-[40px] pl-8 pr-3 py-1.5 rounded-xl bg-[#070A0F]/90 border border-[#2D3B49] text-xs text-[#E9F0F5] placeholder:text-[#95A5B3]/70 focus:border-[#67E5DF]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                data-testid={`category-filter-${cat}`}
                onClick={() => dispatch({ type: 'SET_CATEGORY_FILTER', category: cat })}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider shrink-0 border transition-colors ${
                  active
                    ? 'bg-[#67E5DF] text-[#070A0F] border-[#67E5DF] font-bold'
                    : 'bg-[#070A0F]/60 text-[#95A5B3] border-[#2D3B49] hover:text-[#E9F0F5]'
                }`}
              >
                {cat === 'ALL' ? 'Tất cả (46)' : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Parts List */}
      <div
        role="listbox"
        aria-label="Danh sách bộ phận 3D"
        className="flex-1 overflow-y-auto p-2 space-y-1"
      >
        {filteredParts.map((part) => {
          const isSelected = selectedPartId === part.id;
          const catMeta = CATEGORY_LABELS[part.category];
          return (
            <button
              key={part.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={!canSelect}
              data-testid={`part-item-${part.id}`}
              onClick={() => dispatch({ type: 'SELECT_PART', partId: part.id })}
              className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-left transition-all flex items-center justify-between gap-2 border ${
                isSelected
                  ? 'bg-[#17222E] border-[#67E5DF] text-[#E9F0F5] shadow-[0_0_15px_rgba(103,229,223,0.16)]'
                  : 'bg-[#070A0F]/55 hover:bg-[#17222E]/60 border-[#2D3B49]/50 text-[#E9F0F5] disabled:opacity-40'
              }`}
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isSelected ? 'bg-[#67E5DF]' : 'bg-[#95A5B3]/50'
                    }`}
                  />
                  <span>{part.label.vi}</span>
                </div>
                <div className="text-[11px] text-[#95A5B3] truncate pl-3">
                  {part.label.en}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#0E141D] border border-[#2D3B49] text-[10px] font-mono text-[#67E5DF] shrink-0">
                Tầng {catMeta.layer} · {part.category}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
