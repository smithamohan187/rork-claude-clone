const { query } = require('../../config/database');

async function toggleLike(content_type, content_id, profile_id) {
  const insert = await query(
    `INSERT INTO likes (content_type, content_id, profile_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (content_type, content_id, profile_id) DO NOTHING`,
    [content_type, content_id, profile_id]
  );

  let liked;
  if (insert.rowCount > 0) {
    liked = true;
  } else {
    await query(
      `DELETE FROM likes
       WHERE content_type = $1 AND content_id = $2 AND profile_id = $3`,
      [content_type, content_id, profile_id]
    );
    liked = false;
  }

  const countResult = await query(
    `SELECT COUNT(*)::int AS like_count
     FROM likes WHERE content_type = $1 AND content_id = $2`,
    [content_type, content_id]
  );

  return { liked, like_count: countResult.rows[0].like_count };
}

async function getLikeCount(content_type, content_id) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS like_count
     FROM likes WHERE content_type = $1 AND content_id = $2`,
    [content_type, content_id]
  );
  return rows[0].like_count;
}

async function getLikers(content_type, content_id, limit, offset) {
  const { rows } = await query(
    `SELECT p.id AS profile_id, p.display_name, p.avatar_url
     FROM likes l
     JOIN profiles p ON p.id = l.profile_id
     WHERE l.content_type = $1 AND l.content_id = $2
     ORDER BY l.created_at DESC
     LIMIT $3 OFFSET $4`,
    [content_type, content_id, limit, offset]
  );
  return rows;
}

async function getUserLikedStatus(content_type, content_id, profile_id) {
  const { rows } = await query(
    `SELECT 1 FROM likes
     WHERE content_type = $1 AND content_id = $2 AND profile_id = $3
     LIMIT 1`,
    [content_type, content_id, profile_id]
  );
  return rows.length > 0;
}

async function getContentOwnerProfileId(content_type, content_id) {
  let sql;
  if (content_type === 'offer') {
    sql = `SELECT b.profile_id FROM offers o
           JOIN businesses b ON b.id = o.business_id
           WHERE o.id = $1`;
  } else if (content_type === 'event') {
    sql = `SELECT b.profile_id FROM events e
           JOIN businesses b ON b.id = e.business_id
           WHERE e.id = $1`;
  } else {
    sql = `SELECT b.profile_id FROM posts p
           JOIN businesses b ON b.id = p.business_id
           WHERE p.id = $1`;
  }
  const { rows } = await query(sql, [content_id]);
  return rows[0]?.profile_id ?? null;
}

module.exports = {
  toggleLike,
  getLikeCount,
  getLikers,
  getUserLikedStatus,
  getContentOwnerProfileId,
};
