const MAX_LIMIT = 100;

/**
 * Parse and validate pagination query params.
 * @param {object} query - req.query
 * @param {number} defaultLimit
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePagination(query, defaultLimit = 10) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build a uniform pagination metadata object.
 * @param {number} total - total documents matching the query
 * @param {number} page
 * @param {number} limit
 * @returns {{ total: number, page: number, limit: number, pages: number }}
 */
function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

module.exports = { parsePagination, paginationMeta };
