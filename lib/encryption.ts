/**
 * AES-256-GCM Encryption Module
 * NIST 800-171: SC-13 (Cryptographic Protection), SC-28 (Protection at Rest)
 * FIPS 197 compliant: AES-256 with GCM authenticated encryption.
 *
 * Provides:
 *   - Field-level encryption for CUI data at rest
 *   - Envelope encryption pattern (data key wrapped by master key)
 *   - Key rotation support via versioned key IDs
 *   - HMAC integrity verification for audit log entries
 *
 * Key management:
 *   Master key loaded from ENCRYPTION_MASTER_KEY env var (64 hex chars = 32 bytes).
 *   In production, use AWS KMS / Azure Key Vault / HashiCorp Vault instead.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHmac } from "crypto";

// ── Constants ────────────────────────────────────────────────────────────────
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;       // 96-bit IV per NIST SP 800-38D recommendation
const AUTH_TAG_LENGTH = 16;  // 128-bit authentication tag
const KEY_LENGTH = 32;       // 256-bit key
const CURRENT_KEY_VERSION = 1;

// ── Key Management ───────────────────────────────────────────────────────────

/**
 * Derive the master encryption key from environment variable.
 * In production: replace with KMS/Vault API call.
 */
function getMasterKey(): Buffer {
  const hex = process.env.ENCRYPTION_MASTER_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes). " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Generate a random data encryption key (DEK).
 * Used in envelope encryption pattern.
 */
export function generateDataKey(): Buffer {
  return randomBytes(KEY_LENGTH);
}

// ── Encryption / Decryption ──────────────────────────────────────────────────

export interface EncryptedPayload {
  /** Base64-encoded ciphertext */
  ct: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded GCM authentication tag */
  tag: string;
  /** Key version for rotation tracking */
  kv: number;
  /** Algorithm identifier */
  alg: "aes-256-gcm";
}

/**
 * Encrypt plaintext using AES-256-GCM.
 *
 * @param plaintext - UTF-8 string to encrypt
 * @param key - Optional key (defaults to master key from env)
 * @returns Structured encrypted payload
 *
 * Usage:
 *   const encrypted = encrypt("SSN: 123-45-6789");
 *   // Store encrypted in database
 *   const decrypted = decrypt(encrypted);
 */
export function encrypt(plaintext: string, key?: Buffer): EncryptedPayload {
  const encKey = key ?? getMasterKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, encKey, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ct: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    kv: CURRENT_KEY_VERSION,
    alg: ALGORITHM,
  };
}

/**
 * Decrypt an AES-256-GCM encrypted payload.
 *
 * @param payload - Encrypted payload from encrypt()
 * @param key - Optional key (defaults to master key from env)
 * @returns Decrypted UTF-8 string
 * @throws If authentication tag verification fails (tampered data)
 */
export function decrypt(payload: EncryptedPayload, key?: Buffer): string {
  const decKey = key ?? getMasterKey();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ct, "base64");

  const decipher = createDecipheriv(ALGORITHM, decKey, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

// ── Envelope Encryption ──────────────────────────────────────────────────────

export interface EnvelopeEncryptedPayload {
  /** Encrypted data (encrypted with DEK) */
  data: EncryptedPayload;
  /** DEK encrypted with master key */
  wrappedKey: EncryptedPayload;
}

/**
 * Envelope encrypt: encrypt data with a random DEK, then wrap the DEK
 * with the master key. Standard pattern for KMS integration.
 */
export function envelopeEncrypt(plaintext: string): EnvelopeEncryptedPayload {
  const dek = generateDataKey();
  const masterKey = getMasterKey();

  return {
    data: encrypt(plaintext, dek),
    wrappedKey: encrypt(dek.toString("base64"), masterKey),
  };
}

/**
 * Envelope decrypt: unwrap DEK with master key, then decrypt data.
 */
export function envelopeDecrypt(payload: EnvelopeEncryptedPayload): string {
  const masterKey = getMasterKey();
  const dekBase64 = decrypt(payload.wrappedKey, masterKey);
  const dek = Buffer.from(dekBase64, "base64");

  return decrypt(payload.data, dek);
}

// ── HMAC Integrity ───────────────────────────────────────────────────────────

/**
 * Generate HMAC-SHA256 for audit log integrity verification.
 * NIST AU-9: Protection of Audit Information.
 *
 * @param data - The audit log entry as a JSON string
 * @returns Hex-encoded HMAC signature
 */
export function hmacSign(data: string): string {
  const key = process.env.AUDIT_HMAC_KEY;
  if (!key) {
    // In development, use a placeholder (logs will note missing key)
    return "hmac-key-not-configured";
  }
  return createHmac("sha256", key).update(data).digest("hex");
}

/**
 * Verify HMAC-SHA256 signature of an audit log entry.
 *
 * @param data - The audit log entry as a JSON string
 * @param signature - The HMAC to verify against
 * @returns true if signature is valid
 */
export function hmacVerify(data: string, signature: string): boolean {
  const expected = hmacSign(data);
  if (expected === "hmac-key-not-configured") return false;

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

// ── Field-Level Encryption Helpers ───────────────────────────────────────────

/**
 * Encrypt a specific field value for database storage.
 * Returns a JSON string that can be stored in a text column.
 */
export function encryptField(value: string): string {
  return JSON.stringify(encrypt(value));
}

/**
 * Decrypt a field value retrieved from database storage.
 */
export function decryptField(encrypted: string): string {
  const payload: EncryptedPayload = JSON.parse(encrypted);
  return decrypt(payload);
}

/**
 * Hash a value for indexing (searchable encryption).
 * Uses HMAC so the same plaintext always produces the same hash,
 * but the hash cannot be reversed without the key.
 */
export function hashForIndex(value: string): string {
  const key = process.env.ENCRYPTION_MASTER_KEY ?? "dev-key-not-for-production";
  return createHmac("sha256", key).update(value.toLowerCase().trim()).digest("hex");
}
