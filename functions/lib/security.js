/**
 * Security Module - PBKDF2 Password Hashing & Token Generation
 * Implements OWASP-compliant password storage with timing-safe comparison
 */

// Constants
const PBKDF2_ITERATIONS = 210000; // OWASP 2023 minimum recommendation
const PASSWORD_MIN_LENGTH = 12;

// ==================== Utility Functions ====================

/**
 * Convert Uint8Array to Base64 string
 */
function base64FromBytes(bytes) {
    const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
    return btoa(binString);
}

/**
 * Convert Base64 string to Uint8Array
 */
function bytesFromBase64(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, (char) => char.codePointAt(0));
}

/**
 * Convert Uint8Array to hex string
 */
function hexFromBytes(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ==================== Password Hashing (PBKDF2) ====================

/**
 * Derive key using PBKDF2-HMAC-SHA256
 * @param {string} password - Plain text password
 * @param {Uint8Array} salt - Random salt (128-bit recommended)
 * @param {number} iterations - Number of iterations (default 210,000)
 * @returns {Promise<Uint8Array>} Derived 256-bit key
 */
async function derivePbkdf2(password, salt, iterations = PBKDF2_ITERATIONS) {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256'
        },
        passwordKey,
        256 // 256-bit output
    );

    return new Uint8Array(derivedBits);
}

/**
 * Hash password using PBKDF2-HMAC-SHA256
 * @param {string} password - Plain text password
 * @returns {Promise<{hash: string, salt: string, type: string, iterations: number}>}
 */
export async function hashPassword(password) {
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
        throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }

    const salt = crypto.getRandomValues(new Uint8Array(16)); // 128-bit salt
    const derived = await derivePbkdf2(password, salt);

    return {
        hash: base64FromBytes(derived),
        salt: base64FromBytes(salt),
        type: 'pbkdf2-sha256',
        iterations: PBKDF2_ITERATIONS
    };
}

/**
 * Verify password against stored hash (PBKDF2)
 * @param {string} password - Plain text password to verify
 * @param {string} storedHash - Base64-encoded stored hash
 * @param {string} storedSalt - Base64-encoded stored salt
 * @param {number} iterations - Number of iterations used
 * @returns {Promise<boolean>}
 */
export async function verifyPasswordPbkdf2(password, storedHash, storedSalt, iterations = PBKDF2_ITERATIONS) {
    const salt = bytesFromBase64(storedSalt);
    const derived = await derivePbkdf2(password, salt, iterations);
    const candidateHash = base64FromBytes(derived);

    return timingSafeEqualString(candidateHash, storedHash);
}

/**
 * Verify password against user object (auto-detects hash type)
 * Supports PBKDF2, bcrypt (legacy), and SHA-256 (legacy)
 * @param {string} password - Plain text password
 * @param {Object} user - User object with password_hash, password_salt, password_hash_type
 * @returns {Promise<boolean>}
 */
export async function verifyPasswordAgainstUser(password, user) {
    const hashType = (user?.password_hash_type || '').toLowerCase();

    // PBKDF2 (current standard)
    if (hashType.startsWith('pbkdf2')) {
        return await verifyPasswordPbkdf2(
            password,
            user.password_hash,
            user.password_salt,
            user.password_iterations || PBKDF2_ITERATIONS
        );
    }

    // bcrypt (legacy - requires bcryptjs import in caller)
    if (hashType === 'bcrypt') {
        throw new Error('bcrypt verification must be handled by caller with bcryptjs library');
    }

    // SHA-256 (legacy - insecure, backward compatibility only)
    const legacyHash = await hashPasswordLegacy(password);
    return timingSafeEqualString(legacyHash, user.password_hash);
}

/**
 * Backward-compatible password verification helper
 * @deprecated Prefer calling verifyPasswordAgainstUser directly for clarity
 * @param {string} password
 * @param {Object} user
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, user) {
    if (!user) return false;
    return verifyPasswordAgainstUser(password, user);
}

/**
 * Legacy SHA-256 password hashing (INSECURE - backward compatibility only)
 * @param {string} password
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
async function hashPasswordLegacy(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return hexFromBytes(new Uint8Array(hashBuffer));
}

// ==================== Timing-Safe Comparison ====================

/**
 * Timing-safe string comparison (prevents timing attacks)
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEqualString(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// ==================== Token Generation ====================

/**
 * Generate cryptographically secure random token
 * @param {number} bytes - Number of random bytes (default 32 = 256-bit)
 * @returns {string} Base64-encoded token
 */
export function generateSecureToken(bytes = 32) {
    const buffer = crypto.getRandomValues(new Uint8Array(bytes));
    return base64FromBytes(buffer);
}

/**
 * Hash token using SHA-256 (for storage)
 * @param {string} token - Plain text token
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
export async function hashToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return hexFromBytes(new Uint8Array(hashBuffer));
}

/**
 * Generate order number (format: SBS-XXXXXX-XXXXXX)
 * @returns {string}
 */
export function generateOrderNumber() {
    const randomBytes = crypto.getRandomValues(new Uint8Array(6));
    const part1 = hexFromBytes(randomBytes.slice(0, 3)).toUpperCase();
    const part2 = hexFromBytes(randomBytes.slice(3, 6)).toUpperCase();
    return `SBS-${part1}-${part2}`;
}

// ==================== TOTP Helpers ====================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encode bytes to Base32 (for TOTP secrets)
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function base32Encode(bytes) {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < bytes.length; i++) {
        value = (value << 8) | bytes[i];
        bits += 8;

        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    // Pad to multiple of 8
    while (output.length % 8 !== 0) {
        output += '=';
    }

    return output;
}

/**
 * Generate TOTP secret (160-bit Base32-encoded)
 * @returns {string}
 */
export function generateTotpSecret() {
    const bytes = crypto.getRandomValues(new Uint8Array(20)); // 160 bits
    return base32Encode(bytes).replace(/=+$/, ''); // Remove padding
}

/**
 * Generate recovery codes for TOTP
 * @param {number} count - Number of codes to generate (default 8)
 * @returns {string[]}
 */
export function generateRecoveryCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const bytes = crypto.getRandomValues(new Uint8Array(5));
        const code = Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
        codes.push(code);
    }
    return codes;
}

/**
 * Verify TOTP code against secret
 * @param {string} code - 6-digit code from user
 * @param {string} secret - Base32-encoded secret
 * @param {number} window - Time window tolerance in steps (default ±1 = 30s before/after)
 * @returns {Promise<boolean>}
 */
export async function verifyTotp(code, secret, window = 1) {
    if (!code || !secret) return false;
    if (!/^\d{6}$/.test(code)) return false;

    // Decode Base32 secret
    const secretBytes = base32Decode(secret);

    // Get current time step (30-second intervals)
    const timeStep = Math.floor(Date.now() / 30000);

    // Check current time step ± window
    for (let i = -window; i <= window; i++) {
        const expectedCode = await generateTotpCode(secretBytes, timeStep + i);
        if (timingSafeEqualString(code, expectedCode)) {
            return true;
        }
    }

    return false;
}

/**
 * Decode Base32 string to bytes
 * @param {string} base32
 * @returns {Uint8Array}
 */
function base32Decode(base32) {
    base32 = base32.toUpperCase().replace(/=+$/, '');
    let bits = 0;
    let value = 0;
    let index = 0;
    const output = new Uint8Array(Math.floor(base32.length * 5 / 8));

    for (let i = 0; i < base32.length; i++) {
        const idx = BASE32_ALPHABET.indexOf(base32[i]);
        if (idx === -1) throw new Error('Invalid Base32 character');

        value = (value << 5) | idx;
        bits += 5;

        if (bits >= 8) {
            output[index++] = (value >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }

    return output;
}

/**
 * Generate TOTP code for a given time step
 * @param {Uint8Array} secretBytes
 * @param {number} timeStep
 * @returns {Promise<string>}
 */
async function generateTotpCode(secretBytes, timeStep) {
    // Convert time step to 8-byte buffer (big-endian)
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setBigUint64(0, BigInt(timeStep), false);

    // HMAC-SHA256
    const key = await crypto.subtle.importKey(
        'raw',
        secretBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, timeBuffer);
    const hmac = new Uint8Array(signature);

    // Dynamic truncation (RFC 6238)
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)
    ) % 1000000;

    return code.toString().padStart(6, '0');
}

// ==================== Exports ====================

export const SECURITY_CONSTANTS = {
    PBKDF2_ITERATIONS,
    PASSWORD_MIN_LENGTH
};
