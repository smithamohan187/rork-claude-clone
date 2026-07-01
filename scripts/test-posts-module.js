// scripts/test-posts-module.js
// Posts module end-to-end test — create, list, get, update, toggle, image, delete, guards

const fetch    = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const fs       = require('fs');
const path     = require('path');
const FormData = require('form-data');

const BASE           = 'http://localhost:3000';
const TEST_EMAIL     = process.env.TEST_EMAIL     || 'pinky@test.com';
const TEST_PASSWORD  = process.env.TEST_PASSWORD  || 'Pinky123#';
const TEST_EMAIL_2   = process.env.TEST_EMAIL_2   || 'pinky2@test.com';
const TEST_PASSWORD_2 = process.env.TEST_PASSWORD_2 || 'Pinky123#';

// ── Helper ────────────────────────────────────────────────────────
function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data) console.log('   ', JSON.stringify(data, null, 2));
}

async function run() {
  let accessToken  = '';
  let accessToken2 = '';
  let postId       = '';

  console.log('\n══════════════════════════════════════');
  console.log('   TouchPoints Posts Module Test      ');
  console.log('══════════════════════════════════════');
  console.log(`  Test user: ${TEST_EMAIL}`);

  // ── Step 1: Login ─────────────────────────────────────────────
  log(1, 'INFO', `Logging in as ${TEST_EMAIL}`);
  const loginRes  = await fetch(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ identifier: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    log(1, 'FAIL', 'Login failed — aborting', loginData);
    return;
  }
  accessToken = loginData.data?.accessToken;
  log(1, 'PASS', 'Login success', { hasToken: !!accessToken });

  const authHeaders = {
    Authorization:  `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // ── Step 2: Create post ───────────────────────────────────────
  log(2, 'INFO', 'Creating post — POST /posts');
  const createRes  = await fetch(`${BASE}/posts`, {
    method:  'POST',
    headers: authHeaders,
    body:    JSON.stringify({
      title:   'We are now open on Sundays!',
      content: 'Come visit us every Sunday from 10am to 6pm. Special weekend discounts available.',
    }),
  });
  const createData = await createRes.json();
  if (!createRes.ok || !createData.success) {
    log(2, 'FAIL', 'Create post failed', createData);
    return;
  }
  postId = createData.data?.post?.id;
  log(2, 'PASS', 'Post created', {
    id:        postId,
    title:     createData.data?.post?.title,
    is_active: createData.data?.post?.is_active,
  });

  // ── Step 3: List my posts (active filter) ─────────────────────
  log(3, 'INFO', 'Listing posts — GET /posts/my?status=active');
  const listRes  = await fetch(`${BASE}/posts/my?status=active`, { headers: authHeaders });
  const listData = await listRes.json();
  const found    = listData.data?.posts?.some(p => p.id === postId);
  if (!listRes.ok || !found) {
    log(3, 'FAIL', 'Post not found in active list', listData);
  } else {
    log(3, 'PASS', `Found ${listData.data.posts.length} active post(s)`, { found });
  }

  // ── Step 4: Get post by ID (public — no token) ────────────────
  log(4, 'INFO', `Getting post by ID — GET /posts/${postId}`);
  const getRes  = await fetch(`${BASE}/posts/${postId}`);
  const getData = await getRes.json();
  if (!getRes.ok || getData.data?.post?.id !== postId) {
    log(4, 'FAIL', 'Get by ID failed', getData);
  } else {
    log(4, 'PASS', 'Fetched post by ID', { title: getData.data.post.title });
  }

  // ── Step 5: Update post ───────────────────────────────────────
  log(5, 'INFO', `Updating post title — PUT /posts/${postId}`);
  const updateRes  = await fetch(`${BASE}/posts/${postId}`, {
    method:  'PUT',
    headers: authHeaders,
    body:    JSON.stringify({ title: 'UPDATED: Open every Sunday!' }),
  });
  const updateData = await updateRes.json();
  const contentPreserved = updateData.data?.post?.content?.includes('Come visit us');
  if (!updateRes.ok || updateData.data?.post?.title !== 'UPDATED: Open every Sunday!') {
    log(5, 'FAIL', 'Update failed or title wrong', updateData);
  } else if (!contentPreserved) {
    log(5, 'FAIL', 'COALESCE broken — content was overwritten', updateData);
  } else {
    log(5, 'PASS', 'Title updated, content preserved via COALESCE', {
      title:   updateData.data.post.title,
      content: updateData.data.post.content.slice(0, 40) + '…',
    });
  }

  // ── Step 6: Toggle status → disabled ─────────────────────────
  log(6, 'INFO', `Disabling post — PATCH /posts/${postId}/status`);
  const disableRes  = await fetch(`${BASE}/posts/${postId}/status`, {
    method:  'PATCH',
    headers: authHeaders,
    body:    JSON.stringify({ is_active: false }),
  });
  const disableData = await disableRes.json();
  if (!disableRes.ok || disableData.data?.post?.is_active !== false) {
    log(6, 'FAIL', 'Disable failed', disableData);
  } else {
    log(6, 'PASS', 'Post disabled', { is_active: disableData.data.post.is_active });
  }

  // ── Step 7: Verify filter behaviour ──────────────────────────
  log(7, 'INFO', 'Checking filter: ?status=disabled should include it');
  const disabledListRes  = await fetch(`${BASE}/posts/my?status=disabled`, { headers: authHeaders });
  const disabledListData = await disabledListRes.json();
  const inDisabled = disabledListData.data?.posts?.some(p => p.id === postId);

  const activeListRes  = await fetch(`${BASE}/posts/my?status=active`, { headers: authHeaders });
  const activeListData = await activeListRes.json();
  const notInActive = !activeListData.data?.posts?.some(p => p.id === postId);

  if (inDisabled && notInActive) {
    log(7, 'PASS', 'Filter works: disabled shows in disabled, absent from active');
  } else {
    log(7, 'FAIL', 'Filter wrong', { inDisabled, notInActive });
  }

  // ── Step 8: Toggle status → active ───────────────────────────
  log(8, 'INFO', `Re-enabling post — PATCH /posts/${postId}/status`);
  const enableRes  = await fetch(`${BASE}/posts/${postId}/status`, {
    method:  'PATCH',
    headers: authHeaders,
    body:    JSON.stringify({ is_active: true }),
  });
  const enableData = await enableRes.json();
  if (!enableRes.ok || enableData.data?.post?.is_active !== true) {
    log(8, 'FAIL', 'Re-enable failed', enableData);
  } else {
    log(8, 'PASS', 'Post re-enabled', { is_active: enableData.data.post.is_active });
  }

  // ── Step 9: Upload post image ─────────────────────────────────
  log(9, 'INFO', `Uploading image — POST /posts/${postId}/image`);
  const imagePath = path.join(__dirname, 'test-image.jpg');
  if (!fs.existsSync(imagePath)) {
    log(9, 'INFO', 'No test-image.jpg found — skipping image upload test');
  } else {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    const imgRes  = await fetch(`${BASE}/posts/${postId}/image`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, ...form.getHeaders() },
      body:    form,
    });
    const imgData = await imgRes.json();
    if (!imgRes.ok || !imgData.data?.post?.image_url) {
      log(9, 'FAIL', 'Image upload failed', imgData);
    } else {
      log(9, 'PASS', 'Image uploaded', { image_url: imgData.data.post.image_url });
    }
  }

  // ── Step 10: Delete post ──────────────────────────────────────
  log(10, 'INFO', `Deleting post — DELETE /posts/${postId}`);
  const deleteRes  = await fetch(`${BASE}/posts/${postId}`, {
    method:  'DELETE',
    headers: authHeaders,
  });
  const deleteData = await deleteRes.json();
  if (!deleteRes.ok || !deleteData.success) {
    log(10, 'FAIL', 'Delete failed', deleteData);
  } else {
    // Confirm 404 on subsequent GET
    const confirmRes = await fetch(`${BASE}/posts/${postId}`);
    if (confirmRes.status === 404) {
      log(10, 'PASS', 'Post deleted — subsequent GET returns 404');
    } else {
      log(10, 'FAIL', 'Post deleted but still fetchable', { status: confirmRes.status });
    }
  }

  // ── Step 11: Validation guard (no title → 400) ────────────────
  log(11, 'INFO', 'Validation guard — POST /posts without title');
  const badRes  = await fetch(`${BASE}/posts`, {
    method:  'POST',
    headers: authHeaders,
    body:    JSON.stringify({ content: 'content only, no title' }),
  });
  if (badRes.status === 400) {
    log(11, 'PASS', 'Returns 400 for missing title');
  } else {
    log(11, 'FAIL', `Expected 400, got ${badRes.status}`);
  }

  // ── Step 12: Auth guard (no token → 401) ─────────────────────
  log(12, 'INFO', 'Auth guard — POST /posts without token');
  const noAuthRes = await fetch(`${BASE}/posts`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ title: 'Sneaky post', content: 'This should fail.' }),
  });
  if (noAuthRes.status === 401) {
    log(12, 'PASS', 'Returns 401 without token');
  } else {
    log(12, 'FAIL', `Expected 401, got ${noAuthRes.status}`);
  }

  // ── Step 13: Ownership guard ──────────────────────────────────
  log(13, 'INFO', 'Ownership guard — user 2 cannot modify user 1\'s post');

  // First create a post as user 1 to target
  const ownedRes  = await fetch(`${BASE}/posts`, {
    method:  'POST',
    headers: authHeaders,
    body:    JSON.stringify({ title: 'User 1 post', content: 'Should not be editable by user 2.' }),
  });
  const ownedData = await ownedRes.json();
  const ownedId   = ownedData.data?.post?.id;

  if (!ownedId) {
    log(13, 'INFO', 'Could not create ownership-test post — skipping');
  } else {
    // Log in as user 2
    const login2Res  = await fetch(`${BASE}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ identifier: TEST_EMAIL_2, password: TEST_PASSWORD_2 }),
    });
    const login2Data = await login2Res.json();
    accessToken2 = login2Data.data?.accessToken;

    if (!accessToken2) {
      log(13, 'INFO', `Second test user ${TEST_EMAIL_2} not found — skipping ownership guard`);
    } else {
      const crossRes = await fetch(`${BASE}/posts/${ownedId}`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${accessToken2}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: 'Hijacked!' }),
      });
      if (crossRes.status === 403) {
        log(13, 'PASS', 'Cross-business modification correctly returns 403');
      } else {
        log(13, 'FAIL', `Expected 403, got ${crossRes.status}`);
      }
    }

    // Clean up
    await fetch(`${BASE}/posts/${ownedId}`, { method: 'DELETE', headers: authHeaders });
  }

  console.log('\n══════════════════════════════════════');
  console.log('   Posts Module Test Complete         ');
  console.log('══════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
