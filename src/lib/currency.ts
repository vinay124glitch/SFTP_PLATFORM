/**
 * Currency utilities for the Society Fund Transparency Platform (SFTP).
 * Currency: INR (₹)
 * Storage unit: Integer paise (1 INR = 100 paise)
 * NEVER use floating-point arithmetic for balances and ledger transactions.
 */

export function rupeesToPaise(rupees: number | string): bigint {
  const numericRupees = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(numericRupees) || !isFinite(numericRupees)) {
    throw new Error('Invalid rupee amount');
  }
  // Round to nearest integer paise to avoid any IEEE 754 float representation issues
  return BigInt(Math.round(numericRupees * 100));
}

export function paiseToRupees(paise: bigint | number): number {
  const numericPaise = typeof paise === 'bigint' ? Number(paise) : paise;
  return numericPaise / 100;
}

/**
 * Formats paise into Indian Rupee display format (e.g. ₹1,20,000 or ₹1,25,750.50)
 */
export function formatINR(paise: bigint | number | string | null | undefined, includeDecimals = true): string {
  if (paise === null || paise === undefined) return '₹0';
  
  const numericPaise = typeof paise === 'bigint' 
    ? Number(paise) 
    : typeof paise === 'string' 
      ? parseInt(paise, 10) 
      : paise;
      
  const isNegative = numericPaise < 0;
  const absPaise = Math.abs(numericPaise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  // Format integer rupees into Indian numbering system (e.g., 12,34,567)
  const rupeeStr = rupees.toString();
  let formattedRupees = '';
  
  if (rupeeStr.length <= 3) {
    formattedRupees = rupeeStr;
  } else {
    const lastThree = rupeeStr.substring(rupeeStr.length - 3);
    const otherNumbers = rupeeStr.substring(0, rupeeStr.length - 3);
    formattedRupees = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  const sign = isNegative ? '-' : '';
  if (!includeDecimals && remainderPaise === 0) {
    return `${sign}₹${formattedRupees}`;
  }

  const decimalPart = remainderPaise.toString().padStart(2, '0');
  // If zero decimal and not explicitly required, show clean rupee
  if (remainderPaise === 0) {
    return `${sign}₹${formattedRupees}`;
  }
  return `${sign}₹${formattedRupees}.${decimalPart}`;
}

/**
 * Calculates percentage integer safely
 */
export function calculatePercentage(part: bigint | number, total: bigint | number): number {
  const numPart = typeof part === 'bigint' ? Number(part) : part;
  const numTotal = typeof total === 'bigint' ? Number(total) : total;
  if (numTotal <= 0) return 0;
  return Math.min(Math.round((numPart / numTotal) * 100 * 10) / 10, 999);
}
