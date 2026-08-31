import { BASEMAP_OPTIONS, type Basemap } from './vworldStyle';

interface Props {
  value: Basemap;
  onChange: (b: Basemap) => void;
}

export default function BasemapSwitcher({ value, onChange }: Props) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-gray-200 bg-white/95 p-0.5 shadow-lg backdrop-blur">
      {BASEMAP_OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            value === o.key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
