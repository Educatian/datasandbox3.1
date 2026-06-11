// Minimal CSV parsing for the "bring your own data" flow.
// Handles comma/semicolon/tab delimiters, optional header row, quoted cells.

export interface ParsedCsv {
    headers: string[];
    rows: string[][];
}

const splitLine = (line: string, delim: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (c === delim && !inQuotes) {
            out.push(cur);
            cur = '';
        } else {
            cur += c;
        }
    }
    out.push(cur);
    return out.map(s => s.trim());
};

export const parseCsv = (text: string): ParsedCsv => {
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    // Detect delimiter from the first line
    const candidates: [string, number][] = [',', ';', '\t'].map(d => [d, lines[0].split(d).length]);
    candidates.sort((a, b) => b[1] - a[1]);
    const delim = candidates[0][1] > 1 ? candidates[0][0] : ',';

    const first = splitLine(lines[0], delim);
    const firstIsHeader = first.some(cell => cell !== '' && Number.isNaN(Number(cell)));

    const headers = firstIsHeader ? first : first.map((_, i) => `col${i + 1}`);
    const dataLines = firstIsHeader ? lines.slice(1) : lines;
    const rows = dataLines.map(l => splitLine(l, delim));

    return { headers, rows };
};

/**
 * Extract bivariate numeric points from a parsed CSV using the two columns
 * with the most numeric values (or explicit column indexes).
 */
export const extractBivariate = (
    csv: ParsedCsv,
    xCol?: number,
    yCol?: number,
    maxPoints = 500
): { points: { x: number; y: number }[]; xLabel: string; yLabel: string } => {
    const numericCounts = csv.headers.map((_, c) =>
        csv.rows.reduce((n, r) => n + (r[c] !== undefined && r[c] !== '' && !Number.isNaN(Number(r[c])) ? 1 : 0), 0)
    );
    let xi = xCol;
    let yi = yCol;
    if (xi === undefined || yi === undefined) {
        const ranked = numericCounts
            .map((count, idx) => ({ count, idx }))
            .sort((a, b) => b.count - a.count);
        xi = ranked[0]?.idx ?? 0;
        yi = ranked[1]?.idx ?? Math.min(1, csv.headers.length - 1);
        if (xi > yi) [xi, yi] = [yi, xi]; // keep column order natural
    }

    const points: { x: number; y: number }[] = [];
    for (const r of csv.rows) {
        const x = Number(r[xi!]);
        const y = Number(r[yi!]);
        if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
        if (points.length >= maxPoints) break;
    }
    return { points, xLabel: csv.headers[xi!] || 'x', yLabel: csv.headers[yi!] || 'y' };
};
