// Generate PBKDF2 password hash for IAMADMIN
const password = "IAMADMIN";
const iterations = 100000;

const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

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

console.log('Password: IAMADMIN');
console.log('Hash:', hash);
console.log('Salt:', saltB64);
console.log('Iterations:', iterations);
console.log('');
console.log('SQL Command:');
console.log(`UPDATE users SET password_hash = '${hash}', password_salt = '${saltB64}', password_iterations = ${iterations} WHERE email = 'fredbademosi1@icloud.com';`);
