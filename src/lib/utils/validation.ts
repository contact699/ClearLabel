// Validation utilities

/**
 * Valid barcode formats and their patterns
 */
const BARCODE_PATTERNS = {
  // EAN-13: 13 digits (European Article Number)
  EAN13: /^\d{13}$/,
  // EAN-8: 8 digits (compact version)
  EAN8: /^\d{8}$/,
  // UPC-A: 12 digits (Universal Product Code - North America)
  UPCA: /^\d{12}$/,
  // UPC-E: 6-8 digits (compressed UPC)
  UPCE: /^\d{6,8}$/,
  // ISBN-10: 10 characters (books)
  ISBN10: /^\d{9}[\dXx]$/,
  // ISBN-13: 13 digits (books, starts with 978 or 979)
  ISBN13: /^97[89]\d{10}$/,
};

export interface BarcodeValidationResult {
  isValid: boolean;
  format?: string;
  error?: string;
  normalizedBarcode?: string;
}

/**
 * Validate a barcode string
 * Returns validation result with format detection
 */
export function validateBarcode(barcode: string): BarcodeValidationResult {
  // Clean the input
  const cleaned = barcode.trim().replace(/[\s-]/g, '');
  
  if (!cleaned) {
    return {
      isValid: false,
      error: 'Barcode cannot be empty',
    };
  }

  // Check minimum length
  if (cleaned.length < 6) {
    return {
      isValid: false,
      error: 'Barcode is too short. Must be at least 6 digits.',
    };
  }

  // Check maximum length
  if (cleaned.length > 14) {
    return {
      isValid: false,
      error: 'Barcode is too long. Must be 14 digits or less.',
    };
  }

  // Check for valid characters (digits only for most barcodes)
  if (!/^[\dXx]+$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Barcode can only contain digits (and X for ISBN-10).',
    };
  }

  // Detect format
  let format: string | undefined;
  
  if (BARCODE_PATTERNS.EAN13.test(cleaned)) {
    format = 'EAN-13';
    if (!validateEAN13Checksum(cleaned)) {
      return {
        isValid: false,
        format,
        error: 'Invalid EAN-13 checksum. Please check the barcode.',
      };
    }
  } else if (BARCODE_PATTERNS.EAN8.test(cleaned)) {
    format = 'EAN-8';
  } else if (BARCODE_PATTERNS.UPCA.test(cleaned)) {
    format = 'UPC-A';
    if (!validateUPCAChecksum(cleaned)) {
      return {
        isValid: false,
        format,
        error: 'Invalid UPC-A checksum. Please check the barcode.',
      };
    }
  } else if (BARCODE_PATTERNS.ISBN13.test(cleaned)) {
    format = 'ISBN-13';
  } else if (BARCODE_PATTERNS.ISBN10.test(cleaned)) {
    format = 'ISBN-10';
  } else if (BARCODE_PATTERNS.UPCE.test(cleaned)) {
    format = 'UPC-E';
  } else if (/^\d+$/.test(cleaned)) {
    // Generic numeric barcode - accept it
    format = 'Unknown';
  } else {
    return {
      isValid: false,
      error: 'Unrecognized barcode format.',
    };
  }

  return {
    isValid: true,
    format,
    normalizedBarcode: cleaned.toUpperCase(),
  };
}

/**
 * Validate EAN-13 checksum using modulo 10 algorithm
 */
function validateEAN13Checksum(barcode: string): boolean {
  const digits = barcode.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === digits[12];
}

/**
 * Validate UPC-A checksum using modulo 10 algorithm
 */
function validateUPCAChecksum(barcode: string): boolean {
  const digits = barcode.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 11; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  }
  
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === digits[11];
}

/**
 * Quick check if a string looks like a barcode (less strict)
 */
export function looksLikeBarcode(input: string): boolean {
  const cleaned = input.trim().replace(/[\s-]/g, '');
  return /^\d{6,14}$/.test(cleaned);
}
