const { query } = require('../../config/database');

async function getUserActiveProfileId(userId) {
  const { rows } = await query(
    'SELECT active_profile_id FROM users WHERE id = $1',
    [userId]
  );
  return rows[0]?.active_profile_id ?? null;
}

async function getSubscribedFeed(profileId, category, limit, offset) {
  const { rows } = await query(
    `SELECT item_type, item_id, business_id, business_name, business_logo,
            title, content, image_url, created_at, relevant_date, is_saved,
            like_count, liked_by_me, is_owner, comment_count
     FROM (
       SELECT
         'offer'       AS item_type,
         o.id          AS item_id,
         o.business_id,
         b.name        AS business_name,
         b.logo_url    AS business_logo,
         o.title,
         o.description AS content,
         o.image_url,
         o.created_at,
         o.expires_at  AS relevant_date,
         (so.offer_id IS NOT NULL) AS is_saved,
         (SELECT COUNT(*)::int FROM likes WHERE content_type = 'offer' AND content_id = o.id) AS like_count,
         (SELECT EXISTS(SELECT 1 FROM likes WHERE content_type = 'offer' AND content_id = o.id AND profile_id = $1::uuid)) AS liked_by_me,
         ($1::uuid = (SELECT b2.profile_id FROM businesses b2 WHERE b2.id = o.business_id)) AS is_owner,
         (SELECT COUNT(*)::int FROM comments WHERE content_type = 'offer' AND content_id = o.id AND is_deleted = FALSE) AS comment_count
       FROM offers o
       JOIN businesses b ON b.id = o.business_id
       JOIN subscriptions s
         ON s.business_id = o.business_id
        AND s.profile_id = $1
        AND s.is_active = true
       LEFT JOIN saved_offers so
         ON so.offer_id = o.id
        AND so.profile_id = $1
       WHERE o.status = 'active'
         AND (o.expires_at IS NULL OR o.expires_at > NOW())
         AND ($2::uuid IS NULL OR b.category_id = $2::uuid)

       UNION ALL

       SELECT
         'event'       AS item_type,
         e.id          AS item_id,
         e.business_id,
         b.name        AS business_name,
         b.logo_url    AS business_logo,
         e.title,
         e.description AS content,
         e.image_url,
         e.created_at,
         e.starts_at   AS relevant_date,
         (se.event_id IS NOT NULL) AS is_saved,
         (SELECT COUNT(*)::int FROM likes WHERE content_type = 'event' AND content_id = e.id) AS like_count,
         (SELECT EXISTS(SELECT 1 FROM likes WHERE content_type = 'event' AND content_id = e.id AND profile_id = $1::uuid)) AS liked_by_me,
         ($1::uuid = (SELECT b2.profile_id FROM businesses b2 WHERE b2.id = e.business_id)) AS is_owner,
         (SELECT COUNT(*)::int FROM comments WHERE content_type = 'event' AND content_id = e.id AND is_deleted = FALSE) AS comment_count
       FROM events e
       JOIN businesses b ON b.id = e.business_id
       JOIN subscriptions s
         ON s.business_id = e.business_id
        AND s.profile_id = $1
        AND s.is_active = true
       LEFT JOIN saved_events se
         ON se.event_id = e.id
        AND se.profile_id = $1
       WHERE e.status != 'cancelled'
         AND e.starts_at > NOW()
         AND ($2::uuid IS NULL OR b.category_id = $2::uuid)

       UNION ALL

       SELECT
         'post'        AS item_type,
         p.id          AS item_id,
         p.business_id,
         b.name        AS business_name,
         b.logo_url    AS business_logo,
         p.title,
         p.content,
         p.image_url,
         p.created_at,
         NULL          AS relevant_date,
         (sp.post_id IS NOT NULL) AS is_saved,
         (SELECT COUNT(*)::int FROM likes WHERE content_type = 'post' AND content_id = p.id) AS like_count,
         (SELECT EXISTS(SELECT 1 FROM likes WHERE content_type = 'post' AND content_id = p.id AND profile_id = $1::uuid)) AS liked_by_me,
         ($1::uuid = (SELECT b2.profile_id FROM businesses b2 WHERE b2.id = p.business_id)) AS is_owner,
         (SELECT COUNT(*)::int FROM comments WHERE content_type = 'post' AND content_id = p.id AND is_deleted = FALSE) AS comment_count
       FROM posts p
       JOIN businesses b ON b.id = p.business_id
       JOIN subscriptions s
         ON s.business_id = p.business_id
        AND s.profile_id = $1
        AND s.is_active = true
       LEFT JOIN saved_posts sp
         ON sp.post_id = p.id
        AND sp.profile_id = $1
       WHERE p.is_active = true
         AND ($2::uuid IS NULL OR b.category_id = $2::uuid)
     ) feed
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [profileId, category || null, limit, offset]
  );
  return rows;
}

async function getRecommendedBusinesses(profileId, limit) {
  const { rows } = await query(
    `SELECT
       b.id,
       b.name,
       b.logo_url,
       b.cover_url,
       b.description,
       bc.name AS category,
       COALESCE(
         (SELECT COUNT(*)::int FROM subscriptions
          WHERE business_id = b.id AND is_active = true), 0
       ) AS subscriber_count
     FROM businesses b
     JOIN business_categories bc ON bc.id = b.category_id
     WHERE bc.name IN (
       SELECT ic.name
       FROM profile_interests pi
       JOIN interest_categories ic ON ic.id = pi.interest_id
       WHERE pi.profile_id = $1
     )
     AND b.id NOT IN (
       SELECT business_id FROM subscriptions
       WHERE profile_id = $1 AND is_active = true
     )
     AND b.profile_id NOT IN (
       SELECT id FROM profiles
       WHERE user_id = (SELECT user_id FROM profiles WHERE id = $1)
         AND profile_type = 'business'
     )
     AND b.is_active = true
     ORDER BY subscriber_count DESC, b.created_at DESC
     LIMIT $2`,
    [profileId, limit]
  );
  return rows;
}

async function getRecommendedByLocation(profileId, limit) {
  const { rows } = await query(
    `SELECT
       b.id,
       b.name,
       b.logo_url,
       b.cover_url,
       b.description,
       bc.name AS category,
       COALESCE(
         (SELECT COUNT(*)::int FROM subscriptions
          WHERE business_id = b.id AND is_active = true), 0
       ) AS subscriber_count
     FROM businesses b
     LEFT JOIN business_categories bc ON bc.id = b.category_id
     WHERE b.is_active = true
       AND b.city IS NOT NULL
       AND LOWER(b.city) = LOWER((SELECT city FROM profiles WHERE id = $1))
       AND b.id NOT IN (
         SELECT business_id FROM subscriptions
         WHERE profile_id = $1 AND is_active = true
       )
       AND b.profile_id NOT IN (
         SELECT id FROM profiles
         WHERE user_id = (SELECT user_id FROM profiles WHERE id = $1)
           AND profile_type = 'business'
       )
     ORDER BY subscriber_count DESC, b.created_at DESC
     LIMIT $2`,
    [profileId, limit]
  );
  return rows;
}

async function getTopRatedBusinesses(limit, userId = null) {
  const { rows } = await query(
    `SELECT
       b.id,
       b.name,
       b.logo_url,
       b.cover_url,
       b.description,
       bc.name AS category,
       COALESCE(
         (SELECT COUNT(*)::int FROM subscriptions
          WHERE business_id = b.id AND is_active = true), 0
       ) AS subscriber_count,
       COALESCE(
         (SELECT ROUND(AVG(rating)::numeric, 1) FROM business_reviews
          WHERE business_id = b.id), 0
       ) AS avg_rating
     FROM businesses b
     LEFT JOIN business_categories bc ON bc.id = b.category_id
     WHERE b.is_active = true
       AND ($2::uuid IS NULL OR b.profile_id NOT IN (
         SELECT id FROM profiles WHERE user_id = $2 AND profile_type = 'business'
       ))
     ORDER BY avg_rating DESC, subscriber_count DESC, b.created_at DESC
     LIMIT $1`,
    [limit, userId || null]
  );
  return rows;
}

module.exports = {
  getUserActiveProfileId,
  getSubscribedFeed,
  getRecommendedBusinesses,
  getRecommendedByLocation,
  getTopRatedBusinesses,
};
