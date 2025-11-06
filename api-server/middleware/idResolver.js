/**
 * Middleware to resolve encoded IDs from URL parameters and query strings
 * 
 * This middleware decodes opaque IDs and attaches the numeric ID to the request object.
 * It also validates the ID and returns appropriate error responses for invalid IDs.
 */

const { decodeId, resolveId } = require('../utils/idEncoder');

/**
 * Middleware to resolve an encoded ID from a route parameter
 * 
 * Usage:
 *   app.get('/api/users/:userId', resolveResourceByEncodedId('userId'), handler);
 * 
 * The decoded numeric ID will be available as req.resourceId
 * 
 * @param {string} paramName - The name of the route parameter containing the encoded ID
 * @param {boolean} allowNumeric - If true, also accept numeric IDs (for backwards compatibility)
 * @returns {Function} Express middleware function
 */
function resolveResourceByEncodedId(paramName = 'id', allowNumeric = true) {
  return (req, res, next) => {
    const encodedId = req.params[paramName];
    
    if (!encodedId) {
      return res.status(400).json({
        success: false,
        error: `Missing ${paramName} parameter`
      });
    }
    
    // Resolve ID (supports both encoded and numeric for backwards compatibility)
    const numericId = allowNumeric ? resolveId(encodedId) : decodeId(encodedId);
    
    if (numericId === null) {
      return res.status(404).json({
        success: false,
        error: `Invalid ${paramName}: ${encodedId}`
      });
    }
    
    // Attach decoded ID to request object
    req.resourceId = numericId;
    req.encodedId = encodedId; // Keep original for reference
    
    next();
  };
}

/**
 * Middleware to resolve an encoded ID from a query parameter
 * 
 * Usage:
 *   app.get('/api/resource', resolveQueryId('resourceId'), handler);
 * 
 * @param {string} queryParamName - The name of the query parameter
 * @param {boolean} allowNumeric - If true, also accept numeric IDs
 * @returns {Function} Express middleware function
 */
function resolveQueryId(queryParamName = 'id', allowNumeric = true) {
  return (req, res, next) => {
    const encodedId = req.query[queryParamName];
    
    if (!encodedId) {
      // Query parameters are optional, so just continue
      return next();
    }
    
    const numericId = allowNumeric ? resolveId(encodedId) : decodeId(encodedId);
    
    if (numericId === null) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${queryParamName}: ${encodedId}`
      });
    }
    
    // Attach decoded ID to request object
    req[`${queryParamName}Numeric`] = numericId;
    req[`${queryParamName}Encoded`] = encodedId;
    
    next();
  };
}

/**
 * Helper function to add publicId to API responses
 * 
 * @param {Object} resource - The resource object with numeric 'id' field
 * @returns {Object} - Resource object with 'publicId' added (or original if no id)
 */
function addPublicIdToResponse(resource) {
  if (!resource || typeof resource.id === 'undefined') {
    return resource;
  }
  
  const { encodeId } = require('../utils/idEncoder');
  
  return {
    ...resource,
    publicId: encodeId(resource.id),
    // Optionally remove internal 'id' field for security
    // id: undefined
  };
}

/**
 * Helper function to add publicId to array of resources
 * 
 * @param {Array} resources - Array of resource objects
 * @returns {Array} - Array with publicId added to each resource
 */
function addPublicIdToResponseArray(resources) {
  if (!Array.isArray(resources)) {
    return resources;
  }
  
  return resources.map(addPublicIdToResponse);
}

module.exports = {
  resolveResourceByEncodedId,
  resolveQueryId,
  addPublicIdToResponse,
  addPublicIdToResponseArray
};

