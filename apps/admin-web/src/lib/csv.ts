// Quotes a value so commas, quotes and line breaks are safe in CSV
function escape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Builds a CSV file in the browser and downloads it
export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
  // BOM so Excel opens the file as UTF-8
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}