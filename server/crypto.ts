import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  // Ensure ENCRYPTION_KEY is a proper Buffer
  const key = Buffer.isBuffer(ENCRYPTION_KEY) ? ENCRYPTION_KEY : crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const textParts = text.split(':');
  
  if (textParts.length !== 2) {
    throw new Error(`Invalid encrypted format: expected 2 parts, got ${textParts.length}`);
  }
  
  const ivHex = textParts[0];
  const encryptedText = textParts[1];
  
  if (ivHex.length !== IV_LENGTH * 2) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH * 2} hex chars, got ${ivHex.length}`);
  }
  
  const iv = Buffer.from(ivHex, 'hex');
  // Ensure ENCRYPTION_KEY is a proper Buffer
  const key = Buffer.isBuffer(ENCRYPTION_KEY) ? ENCRYPTION_KEY : crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}