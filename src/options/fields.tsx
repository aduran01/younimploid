import type { Answer } from '../shared/storage/profile';

const INPUT_CLASS = 'mt-1 w-full rounded border border-gray-400 px-2 py-1';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  type?: 'text' | 'email' | 'tel' | 'url' | 'month' | 'date';
  autoComplete?: string;
}

export function TextField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  ...rest
}: TextFieldProps) {
  return (
    <label className="block text-sm">
      {label}
      <input
        type={type}
        className={INPUT_CLASS}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        {...rest}
      />
      {error && <span className="mt-1 block text-red-700">{error}</span>}
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
}: Pick<TextFieldProps, 'label' | 'value' | 'onChange'>) {
  return (
    <label className="block text-sm">
      {label}
      <textarea
        className={INPUT_CLASS}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface AnswerSelectProps {
  label: string;
  value: Answer;
  options: string[];
  onChange: (value: Answer) => void;
}

export function AnswerSelect({ label, value, options, onChange }: AnswerSelectProps) {
  // A value from an imported backup may not be in the list, and must still display.
  const allOptions = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <label className="block text-sm">
      {label}
      <select
        className={INPUT_CLASS}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Not answered</option>
        {allOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
