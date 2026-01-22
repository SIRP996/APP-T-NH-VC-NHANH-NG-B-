
import { Product, ColumnMapping } from '../types';

// Helper function to parse currency strings like "245.000" or "279k" into numbers
const parsePrice = (priceStr: string): number => {
  if (!priceStr || typeof priceStr !== 'string') return 0;
  
  // Handle multiline cells: take the first line that looks like a value
  const lines = priceStr.split(/\r\n|\n|\r/);
  let cleanStr = lines.find(l => l.trim() !== '') || '';
  
  cleanStr = cleanStr.trim().toLowerCase();
  
  if (!cleanStr) return 0;

  // Handle 'k' suffix (e.g., "279k" -> 279000)
  let multiplier = 1;
  if (cleanStr.endsWith('k')) {
      multiplier = 1000;
      cleanStr = cleanStr.slice(0, -1).trim();
  }

  // This handles both "245.000" and "245,000" (removes dots and commas)
  const numericPart = cleanStr.replace(/\./g, '').replace(/,/g, '');
  const val = parseFloat(numericPart);
  
  return isNaN(val) ? 0 : val * multiplier;
};

// A robust CSV line parser that handles quoted fields containing commas.
const smartSplit = (line: string): string[] => {
    const result: string[] = [];
    let currentField = '';
    let inQuotedField = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (inQuotedField) {
            // Inside a quoted field
            if (char === '"') {
                // Check for an escaped quote ("")
                if (i + 1 < line.length && line[i + 1] === '"') {
                    currentField += '"';
                    i++; // Skip the next quote
                } else {
                    // This is the closing quote for the field
                    inQuotedField = false;
                }
            } else {
                currentField += char;
            }
        } else {
            // Not inside a quoted field
            if (char === '"') {
                inQuotedField = true;
            } else if (char === ',') {
                result.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
    }
    result.push(currentField); // Add the last field
    return result;
};

// Robust CSV Parser that handles quoted newlines correctly
const parseCSV = (csvText: string): { data: Record<string, string>[], headers: string[], headerIndex: number } => {
    const rows: string[] = [];
    let currentRow = '';
    let inQuotedField = false;

    // 1. Split CSV into correct rows, respecting quoted newlines
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (inQuotedField) {
            if (char === '"') {
                if (nextChar === '"') {
                    currentRow += '"'; // Escaped quote
                    i++; 
                } else {
                    inQuotedField = false; // End of quoted field
                }
            } else {
                currentRow += char;
            }
        } else {
            if (char === '"') {
                inQuotedField = true;
            } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                // End of row
                rows.push(currentRow);
                currentRow = '';
                if (char === '\r') i++; // Skip \n after \r
                continue; // Skip appending the newline char to the new row
            } else if (char === '\r') {
                // Handle single \r line endings
                rows.push(currentRow);
                currentRow = '';
                continue;
            } else {
                currentRow += char;
            }
        }
    }
    if (currentRow) {
        rows.push(currentRow);
    }

    const lines = rows.filter(line => line.trim() !== '');
    if (lines.length === 0) return { data: [], headers: [], headerIndex: -1 };

    // 2. Find the header row
    let headerIndex = -1;
    let maxCols = 0;
  
    const searchLimit = Math.min(lines.length, 15);
    for (let i = 0; i < searchLimit; i++) {
        const cols = smartSplit(lines[i]);
        const nonEmptyCols = cols.filter(c => c !== '').length;
        if (nonEmptyCols > maxCols) {
            maxCols = nonEmptyCols;
            headerIndex = i;
        }
    }

    if (headerIndex === -1) {
        if (lines.length > 0) {
            headerIndex = 0;
        } else {
            return { data: [], headers: [], headerIndex: -1 };
        }
    }

    const headerLine = lines[headerIndex];
    const headers = smartSplit(headerLine);
  
    // 3. Map data rows
    const dataRows = lines.slice(headerIndex + 1);

    const data = dataRows.map(rowStr => {
        const values = smartSplit(rowStr);
        const rowObject: Record<string, string> = {};
        
        headers.forEach((header, index) => {
            if (header && index < values.length) {
                rowObject[header] = values[index];
            }
        });
        return rowObject;
    }).filter(obj => {
        return Object.values(obj).some(val => val && val.trim() !== '');
    });

    return { data, headers, headerIndex };
};

export const fetchSheetPreviewAndHeaders = async (sheetUrl: string): Promise<{ headers: string[]; previewData: string[][] }> => {
  try {
    const url = `${sheetUrl}&v=${new Date().getTime()}`; // Append cache-buster
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');
    
    if (!response.ok || (contentType && contentType.includes('text/html'))) {
        if (contentType && contentType.includes('text/html')) {
            throw new Error('Lỗi tải CSV: Sheet có thể không được chia sẻ công khai. Vui lòng kiểm tra lại cài đặt chia sẻ.');
        }
        throw new Error(`Lỗi mạng: ${response.statusText}`);
    }

    const csvText = await response.text();
    // Use the robust parser to get preview data correctly
    const { headers: initialHeaders, data, headerIndex } = parseCSV(csvText);
    
    // We construct previewData from the parsed rows, but we need raw array of strings for the preview table
    // Re-parsing rows purely for preview table structure
    const rows: string[] = [];
    let currentRow = '';
    let inQuotedField = false;

    // Quick re-split for preview (reusing the logic or just using the parsed data object?)
    // Using the 'data' object is harder because we need the raw rows for preview (including the ones before header potentially).
    // Let's reuse the robust splitting logic just for getting lines.
    
    // Actually, parseCSV already returns 'lines' internally logic. 
    // Let's simplify: We just need to parse the CSV string into lines respecting quotes, then split columns.
    // The previous implementation of parseCSV did the splitting. We can extract that logic or just use the result of parseCSV headers.
    
    // Let's just use the robust parseCSV to get headers, then just take the first few items from the data result?
    // But preview needs to show the raw rows even before header if possible (though existing UI shows 15 rows).
    // Let's keep it simple: Use parseCSV to get proper headers, and then for preview, just return the first 15 data rows.
    
    let headers = [...initialHeaders];
    if (headerIndex === -1 || headers.length === 0) {
         // Fallback logic handled in parseCSV somewhat, but let's be safe
         if (csvText.trim().length === 0) return { headers: [], previewData: [] };
    }
    
    // To show the exact structure the user sees in Excel, we map the 'data' objects back to arrays
    // This isn't perfect for "previewing raw rows" but good enough for mapping purposes.
    // However, to be strictly correct for the "preview table" which might show rows *before* the detected header (unlikely use case but possible),
    // we should ideally just return the top N rows parsed.
    
    // Let's simply take the top 15 rows from the 'data' returned by parseCSV, as that's what matters for mapping.
    const previewDataObjects = data.slice(0, 15);
    const previewData = previewDataObjects.map(obj => {
        return headers.map(h => obj[h] || '');
    });

    return { headers, previewData };

  } catch (error) {
    console.error("Failed to fetch Google Sheet preview:", error);
    throw error;
  }
};

// Cleans and standardizes product/model IDs from the sheet.
// Handles multiple lines (variants) by joining them.
const normalizeSheetId = (id: string): string => {
    if (!id || typeof id !== 'string') return '';
    
    // Split by newline to handle multiple IDs in one cell (Alt+Enter)
    const parts = id.split(/\r\n|\n|\r/);
    
    // Clean and Deduplicate
    const cleanedParts = Array.from(new Set(parts.map(part => {
        let cleaned = part.trim();
        if (cleaned.startsWith("'")) {
            cleaned = cleaned.substring(1);
        }
        if (/^\d+\.0+$/.test(cleaned)) {
            cleaned = cleaned.split('.')[0];
        }
        return cleaned;
    }).filter(p => p !== '')));

    // Join with " / " 
    return cleanedParts.join(' / ');
};

// Helper to collapse multiline content into a single line for display (e.g. Names)
const normalizeMultilineString = (val: string | undefined): string => {
    if (!val) return '';
    const parts = val.split(/\r\n|\n|\r/).map(s => s.trim()).filter(s => s);
    return Array.from(new Set(parts)).join(' / ');
};

// Helper to get the first non-empty line (for Final Price if needed)
const getFirstLine = (val: string | undefined): string => {
    if (!val) return '';
    const lines = val.split(/\r\n|\n|\r/).filter(s => s.trim() !== '');
    return lines.length > 0 ? lines[0] : '';
};


export const fetchProductsFromSheet = async (sheetUrl: string, mapping: ColumnMapping): Promise<Product[]> => {
  try {
    const url = `${sheetUrl}&v=${new Date().getTime()}`; // Append cache-buster
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');

    if (!response.ok || (contentType && contentType.includes('text/html'))) {
        if (contentType && contentType.includes('text/html')) {
            throw new Error('Lỗi tải CSV: Sheet có thể không được chia sẻ công khai. Vui lòng kiểm tra lại cài đặt chia sẻ.');
        }
        throw new Error(`Lỗi mạng: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const { data: rawData } = parseCSV(csvText);

    // Treat each row as a single product. 
    // Cells with multiple lines (Alt+Enter) are normalized into single fields.
    return rawData.map(row => {
        const rawId = row[mapping.id];
        const rawName = row[mapping.name];
        const rawDisplayPrice = row[mapping.displayPrice];
        const rawFinalPrice = mapping.finalPrice ? row[mapping.finalPrice] : undefined;
        
        // Only create product if we have at least a Name or an ID
        if (rawId || rawName) {
            const product: Product = {
                id: normalizeSheetId(rawId),
                name: normalizeMultilineString(rawName),
                displayPrice: parsePrice(rawDisplayPrice), // Takes first valid price line
                finalPrice: getFirstLine(rawFinalPrice),   // Takes first line of final price
                originalPrice: 0,
            };

            if (mapping.exclusiveId) {
                product.exclusiveId = normalizeSheetId(row[mapping.exclusiveId]);
            }
            if (mapping.modelId) {
                product.modelId = normalizeSheetId(row[mapping.modelId]);
            }
            if (mapping.gift) {
                product.gift = normalizeMultilineString(row[mapping.gift]);
            }

            return product;
        }
        return null;
    })
    .filter((p): p is Product => p !== null && !!p.name && p.displayPrice > 0); 
    
  } catch (error) {
    console.error("Failed to fetch or parse Google Sheet data:", error);
    throw error;
  }
};
