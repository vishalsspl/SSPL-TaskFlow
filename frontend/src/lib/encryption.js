// frontend/src/lib/encryption.js

const ALGORITHM = 'AES-GCM';
const KEY_HEX = import.meta.env.VITE_CHAT_ENCRYPTION_KEY || '';

/**
 * Helper to convert hex string to Uint8Array
 */
const hexToUint8Array = (hex) => {
    if (!hex) return new Uint8Array();
    const pairs = hex.match(/.{1,2}/g) || [];
    return new Uint8Array(pairs.map(p => parseInt(p, 16)));
};

/**
 * Helper to convert Uint8Array to hex string
 */
const uint8ArrayToHex = (arr) => {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Import the hex key as a Web Crypto CryptoKey
 */
const getCryptoKey = async () => {
    const keyData = hexToUint8Array(KEY_HEX);
    if (keyData.length !== 32) {
        throw new Error('Invalid encryption key: must be 32 bytes (64 hex chars)');
    }
    return crypto.subtle.importKey(
        'raw',
        keyData,
        ALGORITHM,
        false,
        ['encrypt', 'decrypt']
    );
};

/**
 * Encrypt plaintext using AES-GCM
 * Returns "iv:ciphertext" in hex
 */
export const encrypt = async (text) => {
    if (!text || !KEY_HEX || !window.crypto?.subtle) return text;

    try {
        const key = await getCryptoKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(text);

        const ciphertext = await crypto.subtle.encrypt(
            { name: ALGORITHM, iv },
            key,
            encoded
        );

        return `${uint8ArrayToHex(iv)}:${uint8ArrayToHex(new Uint8Array(ciphertext))}`;
    } catch (error) {
        console.error('Encryption failed:', error);
        return text;
    }
};

/**
 * Decrypt a value produced by encrypt()
 * Fallback to plaintext if the format doesn't match
 */
export const decrypt = async (stored) => {
    if (!stored || !KEY_HEX || !window.crypto?.subtle) return stored;

    const parts = stored.split(':');
    if (parts.length !== 2) return stored; // Legacy plaintext or wrong format

    try {
        const key = await getCryptoKey();
        const iv = hexToUint8Array(parts[0]);
        const ciphertext = hexToUint8Array(parts[1]);

        const decrypted = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        // Decryption failure (likely wrong key or legacy plaintext that looked like ciphertext)
        return stored;
    }
};
