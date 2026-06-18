const { createWorker } = require('tesseract.js');
const path = require('path');

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        cachePath: path.join(__dirname, '..', '..', '.tesseract-cache')
      });
      return worker;
    })();
  }
  return workerPromise;
}

async function extractTextFromImage(imagePath) {
  const worker = await getWorker();
  const { data } = await worker.recognize(imagePath);
  return { text: data.text || '', confidence: data.confidence || 0 };
}

function parseCNIC(ocrText) {
  if (!ocrText) return null;
  const cleaned = ocrText.replace(/\s+/g, ' ');
  const formattedMatch = cleaned.match(/\b\d{5}-\d{7}-\d\b/);
  if (formattedMatch) return formattedMatch[0];
  const digits = cleaned.replace(/\D/g, '');
  const rawMatch = digits.match(/\d{13}/);
  if (!rawMatch) return null;
  const s = rawMatch[0];
  return `${s.slice(0, 5)}-${s.slice(5, 12)}-${s.slice(12)}`;
}

function parseCNICDetails(ocrText) {
  if (!ocrText) return null;
  const text = ocrText.toUpperCase();
  const cnic = parseCNIC(text);

  const extractLineAfter = (label) => {
    const idx = text.indexOf(label);
    if (idx === -1) return null;
    const slice = text.slice(idx + label.length);
    const line = slice.split(/\n/)[0].trim();
    return line || null;
  };

  const name = extractLineAfter('NAME') || extractLineAfter('NAME:');
  const fatherName = extractLineAfter("FATHER'S NAME") || extractLineAfter('FATHER NAME') || extractLineAfter('FATHER:');
  const dobMatch = text.match(/\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/);
  const dateOfBirth = dobMatch ? dobMatch[1].replace(/-/g, '/').split('/').reverse().join('-') : null;

  let gender = null;
  if (text.includes('MALE')) gender = 'M';
  else if (text.includes('FEMALE')) gender = 'F';

  // Address is usually towards bottom; take last 2–3 non-empty lines
  const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);
  const addressLines = lines.slice(-3);
  const address = addressLines.join(' ').toUpperCase() || null;

  return {
    cnic,
    name: name || null,
    fatherName: fatherName || null,
    dateOfBirth,
    gender,
    address
  };
}

function parseReceipt(ocrText) {
  if (!ocrText) return null;
  const text = ocrText.toUpperCase();

  const keywordAmountMatch = text.match(/(AMOUNT|TOTAL|PAID|PAYMENT)\s*[:\-]?\s*(PKR|RS\.?|RUPEES)?\s*([\d,]+(\.\d{1,2})?)/);

  let amount = null;
  if (keywordAmountMatch) {
    amount = parseFloat(keywordAmountMatch[3].replace(/,/g, ''));
  } else {
    const candidates = [...text.matchAll(/\b([\d,]+(\.\d{1,2})?)\b/g)]
      .map(m => parseFloat(String(m[1]).replace(/,/g, '')))
      .filter(n => !Number.isNaN(n) && n >= 50 && n <= 100000000);
    if (candidates.length) {
      amount = Math.max(...candidates);
    }
  }

  const dateMatch = text.match(/\b(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})\b/);
  const date = dateMatch ? dateMatch[1] : null;

  const txnMatch = text.match(/(TXN|TRANSACTION|TRX|REF|REFERENCE|ID)\s*[:#\-]?\s*([A-Z0-9\-]{6,})/);
  const transactionID = txnMatch ? txnMatch[2] : null;

  let paymentMethod = null;
  let bankType = null;
  let bankName = null;

  if (text.includes('JAZZCASH')) { paymentMethod = 'JazzCash'; bankType = 'JazzCash'; bankName = 'JazzCash'; }
  else if (text.includes('EASYPAISA')) { paymentMethod = 'EasyPaisa'; bankType = 'EasyPaisa'; bankName = 'EasyPaisa'; }
  else if (text.includes('SADAPAY') || text.includes('SADA PAY')) { paymentMethod = 'SadaPay'; bankType = 'SadaPay'; bankName = 'SadaPay'; }
  else if (text.includes('NAYAPAY') || text.includes('NAYA PAY')) { paymentMethod = 'NayaPay'; bankType = 'NayaPay'; bankName = 'NayaPay'; }
  else if (text.includes('UPAISA') || text.includes('U PAISA')) { paymentMethod = 'UPaisa'; bankType = 'UPaisa'; bankName = 'UPaisa'; }
  else if (text.includes('HBL') || text.includes('HABIB BANK')) { paymentMethod = 'Bank Transfer'; bankType = 'Traditional'; bankName = 'HBL'; }
  else if (text.includes('MEEZAN')) { paymentMethod = 'Bank Transfer'; bankType = 'Traditional'; bankName = 'Meezan Bank'; }
  else if (text.includes('MCB')) { paymentMethod = 'Bank Transfer'; bankType = 'Traditional'; bankName = 'MCB'; }
  else if (text.includes('UBL') || text.includes('UNITED BANK')) { paymentMethod = 'Bank Transfer'; bankType = 'Traditional'; bankName = 'UBL'; }
  else if (text.includes('BANK ALFALAH') || text.includes('ALFALAH')) { paymentMethod = 'Bank Transfer'; bankType = 'Traditional'; bankName = 'Bank Alfalah'; }
  else if (text.includes('BANK TRANSFER') || text.includes('IBAN')) { paymentMethod = 'Bank Transfer'; bankType = 'Traditional'; }

  // Try to infer sender number/account from receipt text
  // Prefer mobile number pattern for wallet receipts.
  const phoneMatches = [...text.matchAll(/\b03\d{9}\b/g)].map((m) => m[0]);
  let senderAccountNumber = phoneMatches.length ? phoneMatches[0] : null;

  // For traditional banks, fall back to account-like numeric tokens.
  if (!senderAccountNumber && bankType === 'Traditional') {
    const accountCandidates = [...text.matchAll(/\b\d{8,20}\b/g)].map((m) => m[0]);
    if (accountCandidates.length) senderAccountNumber = accountCandidates[0];
  }

  return { amount, date, transactionID, paymentMethod, bankType, bankName, senderAccountNumber };
}

function parseDisasterEvidence(ocrText) {
  if (!ocrText) return null;
  const cleaned = ocrText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join(' ');
  return cleaned || null;
}

module.exports = {
  extractTextFromImage,
  parseCNIC,
  parseCNICDetails,
  parseReceipt,
  parseDisasterEvidence
};

