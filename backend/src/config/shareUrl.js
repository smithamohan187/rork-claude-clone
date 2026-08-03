// Public base for /s/<code> deep links (business/app/customer invites, content shares).
// Set SHARE_BASE_URL in env per-environment; defaults to the production domain.
const SHARE_BASE_URL = (process.env.SHARE_BASE_URL || 'https://touchpoints.app').replace(/\/$/, '');

module.exports = { SHARE_BASE_URL };
