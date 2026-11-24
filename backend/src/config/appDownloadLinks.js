// Store listing URLs for the "Get the app" buttons on the GET /s/:code share-preview page
// (shareReferrals.service.js's buildPreviewHtml). Both are intentionally null until the app is
// actually published — the preview page still renders both buttons (so the page doesn't look
// broken/unfinished), just disabled, until a real URL lands here.
//
// To go live: set PLAY_STORE_URL (and/or APP_STORE_URL) below once published, no other code
// changes needed — buildPreviewHtml reads these two values only.
const PLAY_STORE_URL = null; // e.g. 'https://play.google.com/store/apps/details?id=app.rork.refer_process_v10'
const APP_STORE_URL = null;  // e.g. 'https://apps.apple.com/app/idXXXXXXXXXX'

module.exports = { PLAY_STORE_URL, APP_STORE_URL };
