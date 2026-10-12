import { BOOKING_LIMITS, type BookingField } from '@/lib/booking/types';

const inputClass =
  'block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs ' +
  'placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 ' +
  'aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/30';

type Props = {
  // Keeps ids unique when two forms are on the page ('' for create, 'edit-' for edit).
  idPrefix: string;
  values: Partial<Record<BookingField, string>>;
  errors: Partial<Record<BookingField, string>>;
  minDate?: string;
};

// Shared booking inputs; `name` attributes stay equal to BOOKING_FIELDS.
export function BookingFields({ idPrefix, values, errors, minDate }: Props) {
  const fieldId = (name: BookingField) => `${idPrefix}${name}`;

  // Shared a11y + error wiring for each field.
  const fieldProps = (name: BookingField) => ({
    id: fieldId(name),
    name,
    defaultValue: values[name],
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${fieldId(name)}-error` : undefined,
  });

  return (
    <>
      <Field label="Tanggal" id={fieldId('date')} error={errors.date}>
        <input type="date" required min={minDate} className={inputClass} {...fieldProps('date')} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Jam Mulai" id={fieldId('startTime')} error={errors.startTime}>
          <input type="time" required className={inputClass} {...fieldProps('startTime')} />
        </Field>
        <Field label="Jam Akhir" id={fieldId('endTime')} error={errors.endTime}>
          <input type="time" required className={inputClass} {...fieldProps('endTime')} />
        </Field>
      </div>

      <Field label="Nama Pemesan" id={fieldId('bookerName')} error={errors.bookerName}>
        <input
          type="text"
          required
          maxLength={BOOKING_LIMITS.bookerName}
          autoComplete="name"
          className={inputClass}
          {...fieldProps('bookerName')}
        />
      </Field>

      <Field label="Nama Tim / Divisi" id={fieldId('division')} error={errors.division}>
        <input
          type="text"
          required
          maxLength={BOOKING_LIMITS.division}
          autoComplete="organization"
          className={inputClass}
          {...fieldProps('division')}
        />
      </Field>

      <Field label="Keperluan / Agenda" id={fieldId('agenda')} error={errors.agenda}>
        <textarea
          required
          rows={4}
          maxLength={BOOKING_LIMITS.agenda}
          className={`${inputClass} resize-y`}
          {...fieldProps('agenda')}
        />
      </Field>
    </>
  );
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-800">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
