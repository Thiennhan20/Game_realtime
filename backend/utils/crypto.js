const crypto = require('crypto');

const GAME_SECRET_KEY = process.env.GAME_SECRET_KEY;

// --- Cryptography Utils (AES-256-GCM) ---
function encryptSecret(text) {
  if (!text) return null;
  const key = Buffer.from(GAME_SECRET_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

function decryptSecret(encryptedData) {
  if (!encryptedData) return null;
  try {
    const key = Buffer.from(GAME_SECRET_KEY, 'hex');
    const [ivHex, encryptedHex, authTagHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return null;
  }
}

module.exports = {
  encryptSecret,
  decryptSecret
};
