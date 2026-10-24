/** Quote text and neutralize spreadsheet formula prefixes, including leading control/space. */
export function csvCell(v: unknown): string {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw Error('Invalid numeric CSV value.');
    return String(v);
  }
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[\s\x00-\x1f\x7f-\x9f]*[=+\-@]/u.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
