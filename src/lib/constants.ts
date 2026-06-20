export const STATUS_OPTIONS = [
  'New',
  'Called - No Answer',
  'Follow-up',
  'Interested',
  'Not Interested',
  'Converted',
  'Wrong Number',
];

export const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-slate-100 text-slate-700 border-slate-200',
  'Called - No Answer': 'bg-amber-100 text-amber-700 border-amber-200',
  'Follow-up': 'bg-blue-100 text-blue-700 border-blue-200',
  'Interested': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Not Interested': 'bg-red-100 text-red-700 border-red-200',
  'Converted': 'bg-purple-100 text-purple-700 border-purple-200',
  'Wrong Number': 'bg-gray-200 text-gray-600 border-gray-300',
};

export function formatDateTime(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  );
}

export function findKey(row: Record<string, any>, candidates: string[]): string | null {
  const keys = Object.keys(row);
  for (const k of keys) {
    const lower = k.toLowerCase().trim();
    if (candidates.some((c) => lower.includes(c))) return k;
  }
  return null;
}

export function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
