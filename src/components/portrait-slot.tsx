import { ImagePlus, X } from 'lucide-react';

/** One required portrait input. Content (labels, hints) arrives via props. */
export function PortraitSlot({
  index,
  label,
  hint,
  value,
  disabled,
  removeLabel,
  onSelect,
  onRemove,
}: {
  index: number;
  label: string;
  hint: string;
  value: string | null;
  disabled: boolean;
  removeLabel: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rumpel-portrait-slot">
      <label
        className={`rumpel-portrait-picker ${value ? 'has-photo' : ''} ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          aria-label={label}
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onSelect(file);
            event.currentTarget.value = '';
          }}
        />
        {value ? (
          <img src={value} alt={label} />
        ) : (
          <span className="rumpel-portrait-empty">
            <ImagePlus className="size-6" strokeWidth={1.4} />
          </span>
        )}
        <span className="rumpel-portrait-tag">@{index}</span>
        <span className="rumpel-portrait-caption">
          <span className="block text-xs font-medium">{label}</span>
          <span className="text-muted-foreground block text-[11px] leading-4">
            {hint}
          </span>
        </span>
      </label>
      {value && (
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="rumpel-portrait-remove"
          aria-label={removeLabel}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
