type SearchBarProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({ value = '', onChange = () => {}, placeholder = 'Search for products' }: SearchBarProps) {
  return (
    <div className="flex w-full max-w-xl items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <span className="text-lg">🔎</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
