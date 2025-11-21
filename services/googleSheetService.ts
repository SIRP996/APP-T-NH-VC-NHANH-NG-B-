import { Product, ColumnMapping } from '../types';

// Helper function to parse currency strings like "245.000" into numbers
const parsePrice = (priceStr: string): number => {
  if (!priceStr || typeof priceStr !== 'string') return 0;
  // This handles both "245.000" and "245,000"
  return Number(String(priceStr).replace(/\./g, '').replace(/,/g, ''));
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


// A more robust CSV parser that auto-detects the header row
const parseCSV = (csvText: string): { data: Record<string, string>[], headers: string[], headerIndex: number } => {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return { data: [], headers: [], headerIndex: -1 };

  // 1. Find the header row by looking for the row with the most non-empty columns in the first 15 lines
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

  // If no suitable header found, fallback to the first line or return empty
  if (headerIndex === -1) {
    if (lines.length > 0) {
        headerIndex = 0;
    } else {
        return { data: [], headers: [], headerIndex: -1 };
    }
  }

  const headerLine = lines[headerIndex];
  const headers = smartSplit(headerLine);
  
  // 2. Data rows are all lines after the header row
  const dataRows = lines.slice(headerIndex + 1);

  const data = dataRows.map(rowStr => {
    const values = smartSplit(rowStr);
    const rowObject: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      // Only map columns that had a header name
      if (header && index < values.length) {
        rowObject[header] = values[index];
      }
    });
    return rowObject;
  }).filter(obj => {
    // A valid row should have at least one non-empty value.
    return Object.values(obj).some(val => val && val.trim() !== '');
  });

  return { data, headers, headerIndex };
};

// Implements "Forward Fill" logic to handle merged cells.
// If a cell is empty, it inherits the value from the row above it.
export const forwardFillData = (data: any[]): any[] => {
    if (data.length === 0) return data;
    
    const filledData: any[] = [];
    let lastRow: any = null;
  
    for (let i = 0; i < data.length; i++) {
      const currentRow = { ...data[i] };
      
      if (lastRow) {
          // Attempt to fill empty fields in the current row with values from the last row
          Object.keys(lastRow).forEach(key => {
               const val = currentRow[key];
               // Check if current is "empty" (undefined, null, or empty string)
               const isEmpty = val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
               
               if (isEmpty) {
                   currentRow[key] = lastRow[key];
               }
          });
      }
  
      filledData.push(currentRow);
      lastRow = currentRow; // Update lastRow to be the current processed row so fills propagate
    }
    return filledData;
  };

export const fetchSheetPreviewAndHeaders = async (sheetUrl: string): Promise<{ headers: string[]; previewData: string[][] }> => {
  try {
    const url = `${sheetUrl}&v=${new Date().getTime()}`; // Append cache-buster
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');
    
    // If the response is HTML, it's likely a login page because the sheet isn't public.
    if (!response.ok || (contentType && contentType.includes('text/html'))) {
        if (contentType && contentType.includes('text/html')) {
            throw new Error('Lỗi tải CSV: Sheet có thể không được chia sẻ công khai. Vui lòng kiểm tra lại cài đặt chia sẻ.');
        }
        throw new Error(`Lỗi mạng: ${response.statusText}`);
    }

    const csvText = await response.text(); // response.text() correctly decodes UTF-8 based on headers
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return { headers: [], previewData: [] };

    const { headers: initialHeaders, headerIndex } = parseCSV(csvText);
    let headers = [...initialHeaders];
    
    if (headerIndex === -1 || headers.length === 0) {
        throw new Error("Không thể phát hiện hàng tiêu đề hợp lệ trong dữ liệu CSV.");
    }
    
    const previewLimit = Math.min(lines.length, headerIndex + 16); // Header row + 15 data rows
    const dataRows = lines.slice(headerIndex + 1, previewLimit);
    
    const previewData = dataRows.map(rowStr => smartSplit(rowStr));
    
    // Find the maximum number of columns present in either the header or the preview rows
    let maxColumns = headers.length;
    previewData.forEach(row => {
        if (row.length > maxColumns) {
            maxColumns = row.length;
        }
    });

    // Pad headers array if it's shorter than some data rows
    while (headers.length < maxColumns) {
        headers.push(''); // Add empty string for missing header names
    }

    // Pad all preview data rows to ensure they all have the same number of columns (maxColumns)
    const uniformPreviewData = previewData.map(row => {
        const newRow = [...row];
        while (newRow.length < maxColumns) {
            newRow.push('');
        }
        return newRow; 
    });

    return { headers, previewData: uniformPreviewData };

  } catch (error) {
    console.error("Failed to fetch Google Sheet preview:", error);
    // Re-throw the specific error message
    throw error;
  }
};

// Cleans and standardizes product/model IDs from the sheet.
const normalizeSheetId = (id: string): string => {
    if (!id || typeof id !== 'string') return '';
    
    let cleanedId = id.trim();
    
    // Google Sheets sometimes adds a single quote prefix to force text format.
    if (cleanedId.startsWith("'")) {
        cleanedId = cleanedId.substring(1);
    }

    // Handle integers that Google Sheets might export as floats (e.g., "12345.0" or "12345.00").
    if (/^\d+\.0+$/.test(cleanedId)) {
        cleanedId = cleanedId.split('.')[0];
    }
    
    return cleanedId;
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

    // Apply forward fill to handle merged cells (NoSQL-like structure where parent info is in top row)
    const data = forwardFillData(rawData);

    return data.map(row => {
        const product: Product = {
            id: normalizeSheetId(row[mapping.id]),
            name: row[mapping.name] || '',
            displayPrice: parsePrice(row[mapping.displayPrice]),
            finalPrice: mapping.finalPrice ? row[mapping.finalPrice] || '' : '',
            originalPrice: 0,
        };

        if (mapping.exclusiveId) {
            product.exclusiveId = normalizeSheetId(row[mapping.exclusiveId]);
        }
        if (mapping.modelId) {
            product.modelId = normalizeSheetId(row[mapping.modelId]);
        }
        if (mapping.gift) {
            product.gift = row[mapping.gift] || '';
        }
        
        return product;
    }).filter(p => p.id && p.name && p.displayPrice > 0); // Filter out rows without essential data
  } catch (error) {
    console.error("Failed to fetch or parse Google Sheet data:", error);
    throw error;
  }
};