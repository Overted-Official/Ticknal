'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, AlertCircle, Sparkles } from '@/components/ui/icon-library';
import { computeCategoryAllocation, type ExpenseAllocationResultItem } from '@/lib/banks/cashflow-math';

interface ExpenseAllocationSliderProps {
  totalSpend: number;
  currency?: string;
  categories: ExpenseAllocationResultItem[];
  onChange: (items: ExpenseAllocationResultItem[]) => void;
  isArabic?: boolean;
}

const PRESET_CATEGORIES = [
  { en: 'Housing & Rent', ar: 'سكن وإيجار' },
  { en: 'Food & Groceries', ar: 'طعام وبقالة' },
  { en: 'Cigarettes & Personal', ar: 'سجائر ومصروف شخصي' },
  { en: 'Leisure & Outings', ar: 'ترفيه وخروج' },
  { en: 'Transport & Fuel', ar: 'مواصلات وبنزين' },
  { en: 'Bills & Utilities', ar: 'فواتير واشتراكات' },
  { en: 'Family & Healthcare', ar: 'عائلة ورعاية صحية' },
];

export default function ExpenseAllocationSlider({
  totalSpend,
  currency = 'EGP',
  categories = [],
  onChange,
  isArabic = false,
}: ExpenseAllocationSliderProps) {
  const [customName, setCustomName] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Compute allocation with auto-balancing remainder
  const allocation = useMemo(() => {
    // Only pass non-General categories to avoid double-counting remainder
    const activeCategories = categories.filter((c) => c.category !== 'General');
    return computeCategoryAllocation(totalSpend, activeCategories);
  }, [totalSpend, categories]);

  const activeCategories = useMemo(() => {
    return categories.filter((c) => c.category !== 'General');
  }, [categories]);

  const handleUpdateAmount = (categoryName: string, amount: number) => {
    const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
    const updated = activeCategories.map((item) => {
      if (item.category === categoryName) {
        return {
          ...item,
          amount: safeAmount,
          percentage: totalSpend > 0 ? Number(((safeAmount / totalSpend) * 100).toFixed(1)) : 0,
        };
      }
      return item;
    });

    const res = computeCategoryAllocation(totalSpend, updated);
    onChange(res.items);
  };

  const handleAddCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (activeCategories.some((c) => c.category.toLowerCase() === trimmed.toLowerCase())) return;

    // Suggest default amount (e.g. 15% of spend or up to remainder)
    const suggestedAmount = allocation.remainder > 0
      ? Math.min(allocation.remainder, Math.round(totalSpend * 0.15))
      : 0;

    const newCategory: ExpenseAllocationResultItem = {
      category: trimmed,
      amount: suggestedAmount,
      percentage: totalSpend > 0 ? Number(((suggestedAmount / totalSpend) * 100).toFixed(1)) : 0,
    };

    const updated = [...activeCategories, newCategory];
    const res = computeCategoryAllocation(totalSpend, updated);
    onChange(res.items);
    setCustomName('');
    setShowAddCustom(false);
  };

  const handleRemoveCategory = (categoryName: string) => {
    const updated = activeCategories.filter((c) => c.category !== categoryName);
    const res = computeCategoryAllocation(totalSpend, updated);
    onChange(res.items);
  };

  // Find presets that have not been added yet
  const availablePresets = useMemo(() => {
    return PRESET_CATEGORIES.filter((preset) => {
      return !activeCategories.some(
        (c) => c.category.toLowerCase() === preset.en.toLowerCase() || c.category === preset.ar
      );
    });
  }, [activeCategories]);

  return (
    <div className="space-y-4 font-sans text-xs sm:text-sm">
      {/* Sticky Remainder / General Balance Chip */}
      <div
        className={`p-3.5 border transition-all ${
          allocation.isOverallocated
            ? 'border-loss-num/30 bg-loss-num/10 text-loss-num'
            : 'border-border-subtle bg-surface-raised text-text-primary'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {allocation.isOverallocated ? (
              <AlertCircle className="w-4 h-4 text-loss-num shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-brand-blue shrink-0" />
            )}
            <div>
              <p className="font-semibold text-xs tracking-tight">
                {isArabic ? 'المصاريف العامة والمعيشة (المتبقي التلقائي)' : 'General / Living (Auto Remainder)'}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {isArabic
                  ? 'أي مصروف لم تخصصه لفئة محددة يتدفق تلقائياً هنا دون الحاجة لتصفير الحسابات يدوياً.'
                  : 'Unallocated spend automatically flows here. No need to force numbers to zero.'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span
              className={`text-base font-bold tabular-nums ${
                allocation.isOverallocated ? 'text-loss-num' : 'text-profit-num'
              }`}
            >
              {allocation.remainder.toLocaleString()}{' '}
              <span className="text-xs font-normal text-text-muted">{currency}</span>
            </span>
            <p className="text-[10px] text-text-muted tabular-nums">
              {totalSpend > 0 ? ((allocation.remainder / totalSpend) * 100).toFixed(1) : 0}%{' '}
              {isArabic ? 'من إجمالي المصروف' : 'of spend'}
            </p>
          </div>
        </div>

        {allocation.isOverallocated && (
          <p className="text-[11px] text-loss-num mt-2 font-medium">
            {isArabic
              ? `إجمالي الفئات (${allocation.allocatedTotal.toLocaleString()} ${currency}) تجاوز المصروف المحسوب (${totalSpend.toLocaleString()} ${currency}) بمقدار ${(allocation.allocatedTotal - totalSpend).toLocaleString()} ${currency}.`
              : `Allocated categories (${allocation.allocatedTotal.toLocaleString()} ${currency}) exceed total spend (${totalSpend.toLocaleString()} ${currency}) by ${(allocation.allocatedTotal - totalSpend).toLocaleString()} ${currency}.`}
          </p>
        )}
      </div>

      {/* Active Category Rows */}
      <div className="space-y-3">
        {activeCategories.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-border-subtle bg-surface-raised/30">
            <p className="text-xs text-text-muted">
              {isArabic
                ? 'لم يتم تحديد فئات بعد. اختر من الفئات المقترحة أدناه أو أضف فئة مخصصة.'
                : 'No categories added yet. Pick from suggested categories below or create a custom one.'}
            </p>
          </div>
        ) : (
          activeCategories.map((item) => {
            const pct = totalSpend > 0 ? (item.amount / totalSpend) * 100 : 0;
            return (
              <div
                key={item.category}
                className="p-3 border border-border-subtle bg-surface-base space-y-2 transition-colors hover:border-border-default"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary text-xs sm:text-sm">
                      {item.category}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 border border-border-subtle bg-surface-raised text-text-muted tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        max={Math.max(totalSpend * 1.5, 100000)}
                        step="100"
                        value={item.amount || ''}
                        onChange={(e) => handleUpdateAmount(item.category, Number(e.target.value))}
                        className="w-24 sm:w-28 bg-surface-raised border border-border-subtle px-2 py-1 text-right text-xs text-text-primary tabular-nums focus:border-brand-blue focus:outline-none"
                        placeholder="0"
                      />
                      <span className="text-[10px] text-text-muted ml-1.5 shrink-0">{currency}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(item.category)}
                      className="p-1 text-text-muted hover:text-loss-num transition-colors cursor-pointer"
                      title={isArabic ? 'حذف الفئة' : 'Remove category'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="0"
                  max={Math.max(totalSpend, 1000)}
                  step="100"
                  value={Math.min(item.amount, totalSpend || 1000)}
                  onChange={(e) => handleUpdateAmount(item.category, Number(e.target.value))}
                  className="w-full h-1 bg-surface-raised appearance-none cursor-pointer accent-brand-blue"
                />
              </div>
            );
          })
        )}
      </div>

      {/* Suggested Quick Add Chips */}
      {availablePresets.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-medium text-text-muted">
            {isArabic ? 'إضافة سريعة لفئات مقترحة:' : 'Quick add suggested categories:'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availablePresets.map((preset) => {
              const label = isArabic ? preset.ar : preset.en;
              return (
                <button
                  key={preset.en}
                  type="button"
                  onClick={() => handleAddCategory(label)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] border border-border-subtle bg-surface-raised hover:bg-surface-hover-raised hover:border-border-default text-text-secondary transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-brand-blue" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Category Input */}
      <div className="pt-2">
        {showAddCustom ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory(customName);
                }
              }}
              placeholder={isArabic ? 'اسم الفئة (مثلاً: جيم، دروس، سفر...)' : 'Category name (e.g. Gym, Tuition...)'}
              className="flex-1 bg-surface-raised border border-border-subtle px-3 py-1.5 text-xs text-text-primary focus:border-brand-blue focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => handleAddCategory(customName)}
              className="btn-primary-cta h-8 px-3 text-xs"
            >
              {isArabic ? 'إضافة' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddCustom(false)}
              className="filter-control-btn h-8 px-2.5 text-xs"
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddCustom(true)}
            className="inline-flex items-center gap-1.5 text-xs text-brand-blue hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isArabic ? '+ إضافة فئة مخصصة أخرى' : '+ Add custom category'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
