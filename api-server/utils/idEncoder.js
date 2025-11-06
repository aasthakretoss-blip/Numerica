/**
 * Secure ID Encoding/Decoding using Hashids
 * 
 * This module provides opaque, URL-safe IDs for all user-facing URLs and API responses.
 * Raw numeric IDs are never exposed to clients.
 */

const Hashids = require('hashids');

// Initialize Hashids with secret salt from environment
// Minimum length of 8 characters for encoded IDs
const hashids = new Hashids(
  process.env.HASHID_SALT || 'change-me-in-production-2024',
  8, // Minimum length of encoded ID
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890' // URL-safe alphabet
);

/**
 * Encode a numeric ID to an opaque string
 * @param {number|string} id - The numeric ID to encode
 * @returns {string} - The encoded opaque ID
 */
function encodeId(id) {
  if (id === null || id === undefined) {
    return null;
  }
  
  const numericId = Number(id);
  if (isNaN(numericId) || numericId < 1) {
    throw new Error(`Invalid ID for encoding: ${id}`);
  }
  
  return hashids.encode(numericId);
}

/**
 * Decode an opaque ID back to a numeric ID
 * @param {string} encodedId - The encoded opaque ID
 * @returns {number|null} - The decoded numeric ID, or null if invalid
 */
function decodeId(encodedId) {
  if (!encodedId || typeof encodedId !== 'string') {
    return null;
  }
  
  try {
    const decoded = hashids.decode(encodedId);
    if (!decoded || decoded.length === 0) {
      return null;
    }
    return decoded[0];
  } catch (error) {
    return null;
  }
}

/**
 * Validate if a string is a valid encoded ID
 * @param {string} encodedId - The encoded ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidEncodedId(encodedId) {
  return decodeId(encodedId) !== null;
}

/**
 * Try to decode an ID, accepting both encoded and numeric formats
 * (For backwards compatibility during transition period)
 * @param {string|number} id - Either an encoded ID or numeric ID
 * @returns {number|null} - The decoded numeric ID, or null if invalid
 */
function resolveId(id) {
  if (typeof id === 'number') {
    // Numeric ID - log deprecation warning but accept it
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ DEPRECATED: Numeric ID used directly. Use encoded ID instead.');
    }
    return id;
  }
  
  if (typeof id === 'string') {
    // Try to decode as encoded ID first
    const decoded = decodeId(id);
    if (decoded !== null) {
      return decoded;
    }
    
    // Fallback: try to parse as numeric (for backwards compatibility)
    const numericId = Number(id);
    if (!isNaN(numericId) && numericId > 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ DEPRECATED: Numeric ID in string format. Use encoded ID instead.');
      }
      return numericId;
    }
  }
  
  return null;
}

module.exports = {
  encodeId,
  decodeId,
  isValidEncodedId,
  resolveId
};

