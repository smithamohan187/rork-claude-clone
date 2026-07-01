// scripts/test-offers-module.js
// Offers module end-to-end test — create, list, get, update, toggle, image, delete

const fetch    = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const fs       = require('fs');
const path     = require('path');
const FormData = require('form-data');

const BASE          = 'http://localhost:3000';
const TEST_EMAIL    = process.env.TEST_EMAIL    || 'pinky@test.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Pinky123#';

// ── Helper ────────────────────────────────────────────────────────
function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data) console.log('   ', JSON.stringify(data, null, 2));
}

async function run() {
  let accessToken = '';
  let offerId     = '';
  let businessId  = '';

  console.log('\n══════════════════════════════════════');
  console.log('   TouchPoints Offers Module Test     ');
  console.log('══════════════════════════════════════');
  console.log(`  Test user: ${TEST_EMAIL}`);

  // ── Step 1: Login ─────────────────────────────────────────────
  // Authenticates the business user and captures the JWT access token
  // used for all subsequent authenticated requests.
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

  // ── Step 2: Create offer ──────────────────────────────────────
  // Verifies POST /offers creates a new offer scoped to the user's
  // business profile. expires_at is 30 days from now so toggle-back
  // and re-enable tests succeed before the expired-guard test.
  const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  log(2, 'INFO', 'Creating offer — POST /offers');
  const createRes  = await fetch(`${BASE}/offers`, {
    method:  'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title:           'Test Offer — Automated Script',
      description:     '20% off all menu items. Created by test-offers-module.js.',
      discount_type:   'percent',
      discount_value:  20,
      original_price:  100,
      terms:           'Valid in-store only. One per customer. Cannot be combined.',
      max_redemptions: 50,
      starts_at:       new Date().toISOString(),
      expires_at:      futureExpiry,
      status:          'active',
    }),
  });
  const createData = await createRes.json();
  if (createRes.status !== 201 || !createData.data?.offer?.id) {
    log(2, 'FAIL', 'Create offer failed — aborting (all subsequent steps need offerId)', createData);
    return;
  }
  offerId    = createData.data.offer.id;
  businessId = createData.data.offer.business_id;
  log(2, 'PASS', 'Offer created', {
    offerId,
    businessId,
    title:            createData.data.offer.title,
    effective_status: createData.data.offer.effective_status,
  });

  // ── Step 3: List my offers ────────────────────────────────────
  // GET /offers/my returns ALL offers for this business (all statuses),
  // unlike the public endpoint which filters to active+non-expired only.
  log(3, 'INFO', 'Listing my offers — GET /offers/my');
  const listRes  = await fetch(`${BASE}/offers/my`, { headers: authHeaders });
  const listData = await listRes.json();
  if (!listRes.ok) {
    log(3, 'FAIL', 'List offers failed', listData);
  } else {
    const found = listData.data?.offers?.some(o => o.id === offerId);
    if (found) {
      log(3, 'PASS', `Offers listed — count: ${listData.data.offers.length}, created offer present`);
    } else {
      log(3, 'FAIL', 'Created offer not found in list', {
        offerId,
        returnedIds: listData.data?.offers?.map(o => o.id),
      });
    }
  }

  // ── Step 4: Get offer by ID ───────────────────────────────────
  // GET /offers/:id is a public endpoint — no auth header required.
  // Confirms the created offer is publicly fetchable and data matches.
  log(4, 'INFO', `Fetching offer by ID — GET /offers/${offerId}`);
  const getRes  = await fetch(`${BASE}/offers/${offerId}`);
  const getData = await getRes.json();
  if (!getRes.ok) {
    log(4, 'FAIL', 'Get offer by ID failed', getData);
  } else {
    const titleMatch = getData.data?.offer?.title === 'Test Offer — Automated Script';
    if (titleMatch) {
      log(4, 'PASS', 'Offer fetched correctly', {
        id:               getData.data.offer.id,
        title:            getData.data.offer.title,
        effective_status: getData.data.offer.effective_status,
      });
    } else {
      log(4, 'FAIL', 'Offer title mismatch', getData.data?.offer);
    }
  }

  // ── Step 5: Update offer ──────────────────────────────────────
  // PUT /offers/:id uses COALESCE so unspecified fields are preserved.
  // Only title and expires_at are changed here; description must persist.
  const longerExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  log(5, 'INFO', `Updating offer — PUT /offers/${offerId}`);
  const updateRes  = await fetch(`${BASE}/offers/${offerId}`, {
    method:  'PUT',
    headers: authHeaders,
    body:    JSON.stringify({
      title:      'Test Offer — Updated Title',
      expires_at: longerExpiry,
    }),
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    log(5, 'FAIL', 'Update offer failed', updateData);
  } else {
    const titleUpdated = updateData.data?.offer?.title === 'Test Offer — Updated Title';
    // COALESCE check: description should still be present (not nulled by partial update)
    const descIntact   = !!updateData.data?.offer?.description;
    if (titleUpdated && descIntact) {
      log(5, 'PASS', 'Offer updated — title changed, description preserved (COALESCE confirmed)', {
        title:       updateData.data.offer.title,
        description: updateData.data.offer.description,
        expires_at:  updateData.data.offer.expires_at,
      });
    } else {
      log(5, 'FAIL', 'Update failed — title not changed or description was nulled', {
        titleUpdated,
        descIntact,
        offer: updateData.data?.offer,
      });
    }
  }

  // ── Step 6: Disable offer ─────────────────────────────────────
  // PATCH /offers/:id/status sets status to 'disabled'.
  // effective_status should reflect 'disabled'.
  log(6, 'INFO', `Disabling offer — PATCH /offers/${offerId}/status`);
  const disableRes  = await fetch(`${BASE}/offers/${offerId}/status`, {
    method:  'PATCH',
    headers: authHeaders,
    body:    JSON.stringify({ status: 'disabled' }),
  });
  const disableData = await disableRes.json();
  if (!disableRes.ok) {
    log(6, 'FAIL', 'Disable offer failed', disableData);
  } else {
    const isDisabled = disableData.data?.offer?.effective_status === 'disabled';
    if (isDisabled) {
      log(6, 'PASS', 'Offer disabled', { effective_status: disableData.data.offer.effective_status });
    } else {
      log(6, 'FAIL', 'effective_status not showing as disabled', disableData.data?.offer);
    }
  }

  // ── Step 7: Re-enable offer ───────────────────────────────────
  // expires_at is 60 days in the future so re-enable should succeed (no expired guard).
  log(7, 'INFO', 'Re-enabling offer (future expires_at — should succeed)');
  const enableRes  = await fetch(`${BASE}/offers/${offerId}/status`, {
    method:  'PATCH',
    headers: authHeaders,
    body:    JSON.stringify({ status: 'active' }),
  });
  const enableData = await enableRes.json();
  if (!enableRes.ok) {
    log(7, 'FAIL', 'Re-enable failed unexpectedly (expires_at is in the future)', enableData);
  } else {
    const isActive = enableData.data?.offer?.effective_status === 'active';
    if (isActive) {
      log(7, 'PASS', 'Offer re-enabled', { effective_status: enableData.data.offer.effective_status });
    } else {
      log(7, 'FAIL', 'effective_status not active after re-enable', enableData.data?.offer);
    }
  }

  // ── Step 8: Expired offer guard ───────────────────────────────
  // Sets expires_at to yesterday (past), disables the offer, then tries
  // to re-enable — the service must reject this with 400.
  log(8, 'INFO', 'Testing expired offer guard: set expires_at to past → disable → try re-enable → expect 400');

  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await fetch(`${BASE}/offers/${offerId}`, {
    method:  'PUT',
    headers: authHeaders,
    body:    JSON.stringify({ expires_at: pastDate }),
  });
  await fetch(`${BASE}/offers/${offerId}/status`, {
    method:  'PATCH',
    headers: authHeaders,
    body:    JSON.stringify({ status: 'disabled' }),
  });

  const guardRes  = await fetch(`${BASE}/offers/${offerId}/status`, {
    method:  'PATCH',
    headers: authHeaders,
    body:    JSON.stringify({ status: 'active' }),
  });
  const guardData = await guardRes.json();
  if (guardRes.status === 400) {
    log(8, 'PASS', 'Expired offer guard triggered — 400 returned', { error: guardData.error });
  } else {
    log(8, 'FAIL', `Expected 400 but got ${guardRes.status} — expired guard not firing`, guardData);
  }

  // ── Step 9: Public filter — active offers for business ────────
  // GET /offers/business/:businessId returns only active, non-expired
  // offers. Our offer is now disabled+expired so it must NOT appear.
  if (businessId) {
    log(9, 'INFO', `Public business offers filter — GET /offers/business/${businessId}`);
    const filterRes  = await fetch(`${BASE}/offers/business/${businessId}`);
    const filterData = await filterRes.json();
    if (!filterRes.ok) {
      log(9, 'FAIL', 'Public filter endpoint failed', filterData);
    } else {
      const appearsInPublic = filterData.data?.offers?.some(o => o.id === offerId);
      if (!appearsInPublic) {
        log(9, 'PASS', `Disabled/expired offer correctly excluded from public endpoint — public count: ${filterData.data?.offers?.length}`);
      } else {
        log(9, 'FAIL', 'Disabled/expired offer appeared in public endpoint — filter not working', { offerId });
      }
    }
  } else {
    log(9, 'INFO', 'Skipped — business_id not present in create response');
  }

  // ── Step 10: Upload offer image ───────────────────────────────
  // POST /offers/:id/image — multipart/form-data, field name 'image'.
  // Uses the same minimal JPEG helper as test-business-module.js.
  log(10, 'INFO', `Uploading offer image — POST /offers/${offerId}/image`);
  const testImagePath = path.join(__dirname, 'test-image.jpg');
  if (!fs.existsSync(testImagePath)) {
    fs.writeFileSync(testImagePath, Buffer.from([
      0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,
      0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0xff,0xd9,
    ]));
  }
  const imgForm = new FormData();
  imgForm.append('image', fs.createReadStream(testImagePath), { filename: 'test-offer.jpg', contentType: 'image/jpeg' });
  const imgRes  = await fetch(`${BASE}/offers/${offerId}/image`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${accessToken}`, ...imgForm.getHeaders() },
    body:    imgForm,
  });
  const imgData = await imgRes.json();
  if (!imgRes.ok) {
    log(10, 'FAIL', 'Image upload failed', imgData);
  } else {
    log(10, 'PASS', 'Image uploaded', { image_url: imgData.data?.offer?.image_url });
  }

  // ── Step 11: Delete offer ─────────────────────────────────────
  // Cleans up the test offer. DELETE returns { id }.
  // Verify with a GET that now returns 404 — confirms hard delete.
  log(11, 'INFO', `Deleting offer — DELETE /offers/${offerId}`);
  const deleteRes  = await fetch(`${BASE}/offers/${offerId}`, {
    method:  'DELETE',
    headers: authHeaders,
  });
  const deleteData = await deleteRes.json();
  if (!deleteRes.ok) {
    log(11, 'FAIL', 'Delete offer failed', deleteData);
  } else {
    log(11, 'PASS', 'Offer deleted', { deletedId: deleteData.data?.id });

    // Verify deletion: GET /offers/:id must return 404
    log('11b', 'INFO', 'Verifying deletion — GET /offers/:id should return 404');
    const verify404Res = await fetch(`${BASE}/offers/${offerId}`);
    if (verify404Res.status === 404) {
      log('11b', 'PASS', 'Deletion confirmed — offer returns 404');
    } else {
      log('11b', 'FAIL', `Expected 404 after delete but got ${verify404Res.status}`);
    }
  }

  // ── Step 12: Validation guard ─────────────────────────────────
  // POST /offers with missing title must return 400 (Joi: title is required, min 3).
  log(12, 'INFO', 'Validation guard — POST /offers with missing title (expect 400)');
  const valRes  = await fetch(`${BASE}/offers`, {
    method:  'POST',
    headers: authHeaders,
    body:    JSON.stringify({ description: 'No title supplied' }),
  });
  if (valRes.status === 400) {
    const valData = await valRes.json();
    log(12, 'PASS', 'Validation rejected missing title with 400', { error: valData.error });
  } else {
    log(12, 'FAIL', `Expected 400 but got ${valRes.status} — Joi validation not firing`);
  }

  // ── Step 13: Unauthenticated request rejected ─────────────────
  // POST /offers without Authorization header must return 401.
  log(13, 'INFO', 'Auth guard — POST /offers with no token (expect 401)');
  const unauthRes = await fetch(`${BASE}/offers`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ title: 'Should be rejected' }),
  });
  if (unauthRes.status === 401) {
    log(13, 'PASS', 'Unauthenticated request correctly rejected with 401');
  } else {
    log(13, 'FAIL', `Expected 401 but got ${unauthRes.status}`);
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log('         Test Run Complete            ');
  console.log('══════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('\n❌ Unhandled error during test run:', err);
});
