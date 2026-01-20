
import { Product, ColumnMapping } from '../types';

// Helper function to parse currency strings like "245.000" or "279k" into numbers
export const parsePrice = (priceInput: string | number | undefined | null): number => {
  if (priceInput === null || priceInput === undefined) return 0;
  if (typeof priceInput === 'number') return priceInput;
  
  const priceStr = String(priceInput);
  
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

  // Remove non-numeric characters except for dots and commas, but be smart about it
  // This handles both "245.000" and "245,000" (removes dots and commas)
  // Also removes currency symbols like ₫, $, etc.
  const numericPart = cleanStr.replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(/,/g, '');
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
    const { headers: initialHeaders, data, headerIndex } = parseCSV(csvText);
    
    let headers = [...initialHeaders];
    if (headerIndex === -1 || headers.length === 0) {
         if (csvText.trim().length === 0) return { headers: [], previewData: [] };
    }
    
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
export const normalizeSheetId = (id: string | number | undefined | null): string => {
    if (id === null || id === undefined) return '';
    const idStr = String(id);
    const parts = idStr.split(/\r\n|\n|\r/);
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
    return cleanedParts.join(' / ');
};

export const normalizeMultilineString = (val: string | number | undefined | null): string => {
    if (val === null || val === undefined) return '';
    const valStr = String(val);
    const parts = valStr.split(/\r\n|\n|\r/).map(s => s.trim()).filter(s => s);
    return Array.from(new Set(parts)).join(' / ');
};

const getFirstLine = (val: string | number | undefined | null): string => {
    if (val === null || val === undefined) return '';
    const valStr = String(val);
    const lines = valStr.split(/\r\n|\n|\r/).filter(s => s.trim() !== '');
    return lines.length > 0 ? lines[0] : '';
};

/**
 * INTELLIGENT DATA FILLING (SQL-like "Window Function" logic)
 * Handles merged cells by filling down values from the previous row
 * if the current row has empty key fields (ID/Name) but has other data (Price).
 */
export const fillMergedCells = (data: Record<string, any>[], mapping: ColumnMapping): Record<string, any>[] => {
    let lastId: any = null;
    let lastName: any = null;
    let lastExclusiveId: any = null;
    let lastModelId: any = null;
    let lastGift: any = null;

    const hasValue = (val: any) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'string') return val.trim() !== '';
        return true; 
    };

    return data.map((row) => {
        // 1. Handle ID Fill Down
        if (hasValue(row[mapping.id])) {
            lastId = row[mapping.id];
        } else if (lastId !== null && hasValue(row[mapping.displayPrice])) {
            row[mapping.id] = lastId;
        }

        // 2. Handle Name Fill Down
        if (hasValue(row[mapping.name])) {
            lastName = row[mapping.name];
        } else if (lastName !== null && hasValue(row[mapping.displayPrice])) {
             row[mapping.name] = lastName;
        }

        // 3. Handle Exclusive ID Fill Down (Optional)
        if (mapping.exclusiveId) {
            if (hasValue(row[mapping.exclusiveId])) {
                lastExclusiveId = row[mapping.exclusiveId];
            } else if (lastExclusiveId !== null && hasValue(row[mapping.displayPrice])) {
                row[mapping.exclusiveId] = lastExclusiveId;
            }
        }

        // 4. Handle Model ID Fill Down (Optional)
        if (mapping.modelId) {
             if (hasValue(row[mapping.modelId])) {
                 lastModelId = row[mapping.modelId];
             } else if (lastModelId !== null && hasValue(row[mapping.displayPrice])) {
                 row[mapping.modelId] = lastModelId;
             }
        }
        
        // 5. Handle Gift Fill Down (Optional - Gifts often span multiple products)
        if (mapping.gift) {
            if (hasValue(row[mapping.gift])) {
                lastGift = row[mapping.gift];
            } else if (lastGift !== null && hasValue(row[mapping.displayPrice])) {
                row[mapping.gift] = lastGift;
            }
        }

        return row;
    });
};


export const fetchProductsFromSheet = async (sheetUrl: string, mapping: ColumnMapping): Promise<Product[]> => {
  try {
    const url = `${sheetUrl}&v=${new Date().getTime()}`;
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

    // Apply Intelligent Fill Down for Merged Cells
    const processedData = fillMergedCells(rawData, mapping);

    return processedData.map(row => {
        const rawId = row[mapping.id];
        const rawName = row[mapping.name];
        const rawDisplayPrice = row[mapping.displayPrice];
        const rawFinalPrice = mapping.finalPrice ? row[mapping.finalPrice] : undefined;
        
        // Only create product if we have at least a Name or an ID
        if (rawId || rawName) {
            const product: Product = {
                id: normalizeSheetId(rawId),
                name: normalizeMultilineString(rawName),
                displayPrice: parsePrice(rawDisplayPrice), 
                finalPrice: getFirstLine(rawFinalPrice), 
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
