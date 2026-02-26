/**
 * generate-keys.js
 *
 * Generates an asymmetric RSA keypair (2048-bit) for RS256 JWT signing and
 * symmetric AES encryption keys, then writes them to server/.env.
 *
 * Ported from the reference-template generate-keys script and adapted for the
 * product-template variable naming convention (JWT_PRIVATE_KEY / JWT_PUBLIC_KEY).
 *
 * Keys are stored with literal \n sequences so that the server-side parsePemKey
 * helper can restore them to proper multi-line PEM format at runtime.
 *
 * Idempotent: skips any key that already has a value.
 *
 * Usage (from project root):
 *   npm install          # installs node-forge
 *   npm run generate-keys
 */

const fs = require('fs');
const forge = require('node-forge');

try {
  const envFilePath = './server/.env';
  let envFile = fs.readFileSync(envFilePath, 'utf8');

  // Check if keys already exist AND have values (not empty)
  const privateKeyExists = /JWT_PRIVATE_KEY=.+BEGIN.*PRIVATE KEY/.test(envFile);
  const publicKeyExists = /JWT_PUBLIC_KEY=.+BEGIN PUBLIC KEY/.test(envFile);
  const encryptKeyExists = /ENCRYPT_KEY=.+/.test(envFile);
  const encryptIvExists = /ENCRYPT_IV=.+/.test(envFile);

  let newEnvFile = envFile;
  let keysGenerated = false;

  // ── RSA keypair ──────────────────────────────────────────────────────────
  if (!privateKeyExists || !publicKeyExists) {
    console.log('Generating RSA keys...');
    const keypair = forge.pki.rsa.generateKeyPair(2048);

    // Convert to PEM; replace real newlines with literal \n so the value fits
    // on a single line in .env. parsePemKey() on the server reverses this.
    const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey).replace(/\n/g, '\\n');
    const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey).replace(/\n/g, '\\n');

    const publicKeyLineExists = /JWT_PUBLIC_KEY=/m.test(newEnvFile);
    const privateKeyLineExists = /JWT_PRIVATE_KEY=/m.test(newEnvFile);

    if (!publicKeyExists) {
      if (publicKeyLineExists) {
        newEnvFile = newEnvFile.replace(/JWT_PUBLIC_KEY=.*$/m, `JWT_PUBLIC_KEY=${publicKeyPem}`);
      } else {
        newEnvFile += `\nJWT_PUBLIC_KEY=${publicKeyPem}`;
      }
    }

    if (!privateKeyExists) {
      if (privateKeyLineExists) {
        newEnvFile = newEnvFile.replace(/JWT_PRIVATE_KEY=.*$/m, `JWT_PRIVATE_KEY=${privateKeyPem}`);
      } else {
        newEnvFile += `\nJWT_PRIVATE_KEY=${privateKeyPem}`;
      }
    }

    console.log('RSA keys generated successfully!');
    keysGenerated = true;
  } else {
    console.log('RSA keys already exist, skipping...');
  }

  // ── Symmetric encryption keys ────────────────────────────────────────────
  if (!encryptKeyExists || !encryptIvExists) {
    console.log('Generating encryption keys...');
    const encryptionKey = forge.random.getBytesSync(32);
    const encryptionKeyBase64 = Buffer.from(encryptionKey, 'binary').toString('base64');
    const iv = forge.random.getBytesSync(16);
    const ivBase64 = Buffer.from(iv, 'binary').toString('base64');

    const encryptKeyLineExists = /ENCRYPT_KEY=/m.test(newEnvFile);
    const encryptIvLineExists = /ENCRYPT_IV=/m.test(newEnvFile);

    if (!encryptKeyExists) {
      if (encryptKeyLineExists) {
        newEnvFile = newEnvFile.replace(/ENCRYPT_KEY=.*$/m, `ENCRYPT_KEY=${encryptionKeyBase64}`);
      } else {
        newEnvFile += `\nENCRYPT_KEY=${encryptionKeyBase64}`;
      }
    }

    if (!encryptIvExists) {
      if (encryptIvLineExists) {
        newEnvFile = newEnvFile.replace(/ENCRYPT_IV=.*$/m, `ENCRYPT_IV=${ivBase64}`);
      } else {
        newEnvFile += `\nENCRYPT_IV=${ivBase64}`;
      }
    }

    console.log('Encryption keys generated successfully!');
    keysGenerated = true;
  } else {
    console.log('Encryption keys already exist, skipping...');
  }

  if (keysGenerated) {
    fs.writeFileSync(envFilePath, newEnvFile);
    console.log('\n✓ Keys written to server/.env');
  } else {
    console.log('\n✓ All keys already exist. No changes made.');
  }
} catch (error) {
  console.error('Error generating keys:', error.message);
  console.error(error.stack);
  process.exit(1);
}
