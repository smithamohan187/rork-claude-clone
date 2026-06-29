// Model layer — raw SQL only. No business logic lives here.
const { query } = require('../../config/database');

/**
 * Fetch a paginated list of businesses with subscriber count and rating data.
 * Uses LEFT JOINs so businesses with no subscribers or ratings still appear.
 * Table aliases are used throughout because 'id' is ambiguous across tables.
 *
 * @param {Object} filters
 * @param {string|null} filters.search     - ILIKE match against business name
 * @param {string|null} filters.category   - exact match against business_type ('goodwill' | 'incentivised')
 * @param {number}      filters.limit      - how many rows to return (default 20)
 * @param {number}      filters.offset     - how many rows to skip for pagination
 * @returns {{ rows: Object[], total: number }}
 */
async function getBusinessDirectory({ search, category, limit, offset }) {
  // Normalise: empty string treated as null so the IS NULL check works correctly
  const searchParam   = search   && search.trim()   ? search.trim()   : null;
  const categoryParam = category && category.trim() ? category.trim() : null;

  // COUNT query — same WHERE as the main query, but no LIMIT/OFFSET
  // Filters by category name via JOIN to business_categories (not business_type column)
  const countResult = await query(
    `SELECT COUNT(DISTINCT b.id)::int AS total
     FROM businesses b
     LEFT JOIN business_categories bc ON bc.id = b.category_id
     WHERE b.is_active = TRUE
       AND ($1::text IS NULL OR b.name ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL OR bc.name = $2)`,
    [searchParam, categoryParam]
  );
  const total = countResult.rows[0]?.total ?? 0;

  // Main query — aggregate subscriber count and rating per business, plus category name and icon
  const { rows } = await query(
    `SELECT
       b.id,
       b.name,
       b.business_type,
       b.city,
       b.logo_url,
       bc.name  AS category_name,
       bc.icon  AS category_icon,
       COUNT(DISTINCT s.id) FILTER (WHERE s.is_active = TRUE)  AS subscriber_count,
       ROUND(AVG(br.rating)::numeric, 1)                        AS avg_rating,
       COUNT(DISTINCT br.id)                                    AS rating_count
     FROM businesses b
     LEFT JOIN business_categories bc ON bc.id = b.category_id
     LEFT JOIN subscriptions s        ON s.business_id = b.id
     LEFT JOIN business_ratings br    ON br.business_id = b.id
     WHERE b.is_active = TRUE
       AND ($1::text IS NULL OR b.name ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL OR bc.name = $2)
     GROUP BY b.id, bc.name, bc.icon
     ORDER BY subscriber_count DESC, b.name ASC
     LIMIT $3 OFFSET $4`,
    [searchParam, categoryParam, limit, offset]
  );

  return { rows, total };
}

/**
 * Return all active business categories with their icon names for the filter chips.
 * Queries the business_categories table directly — not business_type on businesses.
 * @returns {{ id: string, name: string, icon: string|null }[]}
 */
async function getBusinessCategories() {
  const { rows } = await query(
    `SELECT id, name, icon
     FROM business_categories
     WHERE is_active = TRUE
     ORDER BY sort_order ASC, name ASC`
  );
  return rows;
}

module.exports = {
  getBusinessDirectory,
  getBusinessCategories,
};
