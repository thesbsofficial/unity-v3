// Generate PBKDF2 password hash for a provided password
const passwordInput = typeof process !== 'undefined' ? process.argv[2] : undefined;
if (!passwordInput) {
    console.error('Usage: node generate-password-hash.js <password> [user-email]');
    if (typeof process !== 'undefined' && typeof process.exit === 'function') {
        process.exit(1);
    }
    throw new Error('Password argument required');
}

const password = passwordInput;
const iterations = 100000;

const enc = new TextEncoder();
const b64 = (buf) => {
    if (typeof btoa === 'function') {
        return btoa(String.fromCharCode(...new Uint8Array(buf)));
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(buf).toString('base64');
    }
    throw new Error('No base64 encoder available');
};

// Generate random salt
const salt = crypto.getRandomValues(new Uint8Array(32));

// Import password as key
const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
);

// Derive bits
const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
);

const hash = b64(bits);
const saltB64 = b64(salt);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('Salt:', saltB64);
console.log('Iterations:', iterations);
console.log('');
console.log('SQL Command:');
const targetEmail = (typeof process !== 'undefined' && process.argv[3]) || 'user@example.com';
console.log(`UPDATE users SET password_hash = '${hash}', password_salt = '${saltB64}', password_iterations = ${iterations} WHERE email = '${targetEmail}';`);
