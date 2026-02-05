import * as crypto from "crypto";

// ============================================================================
// Constants
// ============================================================================

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits

// scrypt parameters (N=16384, r=8, p=1)
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

// ============================================================================
// Types
// ============================================================================

export interface EncryptedData {
  salt: string; // hex
  iv: string; // hex
  authTag: string; // hex
  data: string; // hex (encrypted content)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate random bytes and return as hex string
 */
function randomHex(length: number): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Derive encryption key from password using scrypt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
}

// ============================================================================
// Public Functions
// ============================================================================

/**
 * Generate a random salt for encryption
 */
export function generateSalt(): string {
  return randomHex(SALT_LENGTH);
}

/**
 * Generate a random IV for encryption
 */
export function generateIV(): string {
  return randomHex(IV_LENGTH);
}

/**
 * Encrypt data object with password using AES-256-GCM
 * 
 * @param data - Object to encrypt (will be JSON stringified)
 * @param password - Password for encryption
 * @returns Encrypted data with salt, iv, authTag, and encrypted content
 */
export function encrypt(data: object, password: string): EncryptedData {
  // Generate random salt and IV
  const salt = Buffer.from(generateSalt(), "hex");
  const iv = Buffer.from(generateIV(), "hex");

  // Derive key from password
  const key = deriveKey(password, salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // Encrypt data
  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  // Get auth tag
  const authTag = cipher.getAuthTag();

  return {
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    data: encrypted.toString("hex"),
  };
}

/**
 * Decrypt data with password using AES-256-GCM
 * 
 * @param encrypted - Encrypted data object
 * @param password - Password for decryption
 * @returns Decrypted object
 * @throws Error if password is wrong or data is corrupted
 */
export function decrypt<T = unknown>(encrypted: EncryptedData, password: string): T {
  // Convert hex strings to buffers
  const salt = Buffer.from(encrypted.salt, "hex");
  const iv = Buffer.from(encrypted.iv, "hex");
  const authTag = Buffer.from(encrypted.authTag, "hex");
  const data = Buffer.from(encrypted.data, "hex");

  // Derive key from password
  const key = deriveKey(password, salt);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // Set auth tag for verification
  decipher.setAuthTag(authTag);

  try {
    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]);

    // Parse JSON
    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch (error) {
    // Auth tag verification failed or JSON parse failed
    throw new Error("Invalid password or corrupted file");
  }
}

/**
 * Verify if a password can decrypt the data
 * 
 * @param encrypted - Encrypted data object
 * @param password - Password to verify
 * @returns true if password is correct
 */
export function verifyPassword(encrypted: EncryptedData, password: string): boolean {
  try {
    decrypt(encrypted, password);
    return true;
  } catch {
    return false;
  }
}
