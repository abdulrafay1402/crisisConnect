const paginate = (query, page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (p - 1) * l;
  return {
    sql: `ORDER BY 1 OFFSET ${offset} ROWS FETCH NEXT ${l} ROWS ONLY`,
    page: p,
    limit: l,
    offset
  };
};

const paginateResponse = (data, total, page, limit) => ({
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  }
});

module.exports = { paginate, paginateResponse };
