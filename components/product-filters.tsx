'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from './button';
import { SearchBar } from './search-bar';
import type { Category } from '@/types/marketplace';

type ProductFiltersProps = {
  categories: Category[];
  initialQuery?: string;
  initialCategory?: string;
  initialMinPrice?: string;
  initialMaxPrice?: string;
};

const fieldClass =
  'w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
const labelClass = 'mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200';

export function ProductFilters({ categories, initialQuery = '', initialCategory = '', initialMinPrice = '', initialMaxPrice = '' }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [brand, setBrand] = useState('');
  const [available, setAvailable] = useState(false);
  const [sort, setSort] = useState('newest');
  const debounceRef = useRef<number | null>(null);

  const categoryOptions = useMemo(() => ['All', ...categories.map((item) => item.name)], [categories]);

  const updateSearch = (updated: { q?: string; category?: string; minPrice?: string; maxPrice?: string; brand?: string; available?: boolean; sort?: string }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updated.q !== undefined) {
      const value = updated.q.trim();
      if (value) {
        params.set('q', value);
      } else {
        params.delete('q');
      }
    }

    if (updated.category !== undefined) {
      if (updated.category && updated.category !== 'All') {
        params.set('category', updated.category);
      } else {
        params.delete('category');
      }
    }

    if (updated.minPrice !== undefined) {
      const value = updated.minPrice.trim();
      if (value) {
        params.set('minPrice', value);
      } else {
        params.delete('minPrice');
      }
    }

    if (updated.maxPrice !== undefined) {
      const value = updated.maxPrice.trim();
      if (value) {
        params.set('maxPrice', value);
      } else {
        params.delete('maxPrice');
      }
    }

    if (updated.brand !== undefined) {
      if (updated.brand) params.set('brand', updated.brand);
      else params.delete('brand');
    }

    if (updated.available !== undefined) {
      if (updated.available) params.set('available', '1');
      else params.delete('available');
    }

    if (updated.sort !== undefined) {
      if (updated.sort) params.set('sort', updated.sort);
      else params.delete('sort');
    }

    const queryString = params.toString();
    router.push(`/products${queryString ? `?${queryString}` : ''}`);
  };

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateSearch({ q: query, category, minPrice, maxPrice, brand, available, sort });
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <SearchBar value={query} onChange={setQuery} placeholder="Search phone, laptop, fashion..." />
        <Button className="w-full sm:w-40" variant="primary" onClick={() => updateSearch({ q: query, category, minPrice, maxPrice })}>
          Search
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Category</label>
          <select
            className={fieldClass}
            value={category || 'All'}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Brand</label>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand" className={fieldClass} />
        </div>

        <div>
          <label className={labelClass}>Min price</label>
          <input
            type="number"
            min={0}
            step={100}
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            className={fieldClass}
            placeholder="0"
          />
        </div>

        <div>
          <label className={labelClass}>Sort by</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={fieldClass}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="best_rated">Best rated</option>
            <option value="popular">Most popular</option>
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <label className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-500 dark:border-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
          />
          In stock
        </label>

        <Button
          variant="secondary"
          onClick={() => {
            setQuery('');
            setCategory('');
            setMinPrice('');
            setMaxPrice('');
            setBrand('');
            setAvailable(false);
            setSort('newest');
            updateSearch({ q: '', category: '', minPrice: '', maxPrice: '', brand: '', available: false, sort: 'newest' });
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}