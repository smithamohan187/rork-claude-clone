// scripts/test-reviews-module.js
// Reviews module end-to-end test — summary, submit, upsert, list, breakdown, guards

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE           = 'http://localhost:3000';
const TEST_EMAIL     = process.env.TEST_EMAIL     || 'pinky@test.com';
const TEST_PASSWORD  = process.env.TEST_PASSWORD  || 'Pinky123#';
// A second user who is NOT subscribed to the test business
const TEST_EMAIL_2   = process.env.TEST_EMAIL_2   || 'pinky2@test.com';
const TEST_PASSWORD_2 = process.env.TEST_PASSWORD_2 || 'Pinky123#';
// Must be set to the UUID of an existing business the test user IS subscribed to
const TEST_BUSINESS_ID = process.env.TEST_BUSINESS_ID || '';

// ── Helper ────────────────────────────────────────────────────────
function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data) console.log('   ', JSON.stringify(data, null, 2));
}

async function run() {
  if (!TEST_BUSINESS_ID) {
    console.error('\n❌ TEST_BUSINESS_ID env var is required.');
    console.error('   Set it to the UUID of a business that TEST_EMAIL is subscribed to.');
    console.error('   Example: TEST_BUSINESS_ID=<uuid> node scripts/test-reviews-module.js\n');
    process.exit(1);
  }

  let accessToken  = '';
  let accessToken2 = '';
  let listLengthAfterFirstSubmit = 0;

  console.log('\n══════════════════════════════════════');
  console.log('  TouchPoints Reviews Module Test     ');
  console.log('══════════════════════════════════════');
  console.log(`  Subscriber:     ${TEST_EMAIL}`);
  console.log(`  Non-subscriber: ${TEST_EMAIL_2}`);
  console.log(`  Business ID:    ${TEST_BUSINESS_ID}`);

  // ── Step 1: Login (subscriber) ────────────────────────────────
  // Authenticates the primary test user — expected to be subscribed
  // to TEST_BUSINESS_ID so that POST /reviews succeeds.
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

  // ── Step 2: Summary (public, no auth) ────────────────────────
  // GET /reviews/summary is a public endpoint — verifies it returns
  // the expected shape without a token. average_rating is a numeric
  // string from PostgreSQL — the frontend wraps it in Number().
  log(2, 'INFO', `Public rating summary — GET /reviews/summary?business_id=${TEST_BUSINESS_ID}`);
  const summaryRes  = await fetch(`${BASE}/reviews/summary?business_id=${TEST_BUSINESS_ID}`);
  const summaryData = await summaryRes.json();
  if (!summaryRes.ok) {
    log(2, 'FAIL', 'Summary fetch failed', summaryData);
  } else {
    const hasShape = 'average_rating' in (summaryData.data ?? {}) && 'review_count' in (summaryData.data ?? {});
    if (hasShape) {
      log(2, 'PASS', 'Summary returned expected shape', {
        average_rating: summaryData.data.average_rating,
        review_count:   summaryData.data.review_count,
      });
    } else {
      log(2, 'FAIL', 'Response missing average_rating or review_count', summaryData.data);
    }
  }

  // ── Step 3: My review before submitting ───────────────────────
  // GET /reviews/me should return { review: null } for a user who
  // has not yet submitted a review for this business.
  log(3, 'INFO', `My review before submit — GET /reviews/me?business_id=${TEST_BUSINESS_ID}`);
  const meRes1  = await fetch(`${BASE}/reviews/me?business_id=${TEST_BUSINESS_ID}`, { headers: authHeaders });
  const meData1 = await meRes1.json();
  if (!meRes1.ok) {
    log(3, 'FAIL', 'GET /reviews/me failed', meData1);
  } else {
    // review may be null (first run) or an existing row (repeat runs)
    log(3, 'PASS', 'GET /reviews/me responded', { review: meData1.data?.review ?? null });
  }

  // ── Step 4: Submit review (subscriber) ───────────────────────
  // POST /reviews with rating=4 and review_text. Backend checks
  // subscription, upserts the row, and returns the updated summary.
  log(4, 'INFO', 'Submitting review (rating=4) — POST /reviews');
  const submitRes  = await fetch(`${BASE}/reviews`, {
    method:  'POST',
    headers: authHeaders,
    body:    JSON.stringify({
      business_id: TEST_BUSINESS_ID,
      rating:      4,
      review_text: 'Great business — automated test review.',
    }),
  });
  const submitData = await submitRes.json();
  if (submitRes.status !== 201) {
    log(4, 'FAIL', `Expected 201 but got ${submitRes.status}`, submitData);
  } else {
    const hasUpdatedSummary = submitData.data?.average_rating !== undefined;
    if (hasUpdatedSummary) {
      log(4, 'PASS', 'Review submitted — updated summary returned', {
        average_rating: submitData.data.average_rating,
        review_count:   submitData.data.review_count,
      });
    } else {
      log(4, 'FAIL', 'Response did not include updated summary', submitData.data);
    }
  }

  // ── Step 5: Summary updated ───────────────────────────────────
  // Confirms the summary endpoint reflects the new review.
  // review_count must be ≥ 1.
  log(5, 'INFO', 'Summary after submit — verify review_count ≥ 1');
  const summary2Res  = await fetch(`${BASE}/reviews/summary?business_id=${TEST_BUSINESS_ID}`);
  const summary2Data = await summary2Res.json();
  if (!summary2Res.ok) {
    log(5, 'FAIL', 'Summary fetch failed', summary2Data);
  } else {
    const count = Number(summary2Data.data?.review_count ?? 0);
    if (count >= 1) {
      log(5, 'PASS', 'review_count ≥ 1 after submit', {
        average_rating: summary2Data.data.average_rating,
        review_count:   count,
      });
    } else {
      log(5, 'FAIL', 'review_count is still 0 after submit', summary2Data.data);
    }
  }

  // ── Step 6: My review after submitting ───────────────────────
  // GET /reviews/me must now return the submitted review row with
  // rating=4 and the correct review_text.
  log(6, 'INFO', 'My review after submit — GET /reviews/me');
  const meRes2  = await fetch(`${BASE}/reviews/me?business_id=${TEST_BUSINESS_ID}`, { headers: authHeaders });
  const meData2 = await meRes2.json();
  if (!meRes2.ok) {
    log(6, 'FAIL', 'GET /reviews/me failed', meData2);
  } else {
    const review = meData2.data?.review;
    const ratingMatch = review?.rating === 4;
    const textMatch   = review?.review_text === 'Great business — automated test review.';
    if (ratingMatch && textMatch) {
      log(6, 'PASS', 'My review matches submitted values', {
        rating:      review.rating,
        review_text: review.review_text,
      });
    } else {
      log(6, 'FAIL', 'Review rating or text mismatch', { review });
    }
  }

  // ── Step 7: Review list ───────────────────────────────────────
  // GET /reviews/list is public. Verifies the submitted review appears
  // and that the display_name field is populated (JOIN on profiles).
  log(7, 'INFO', `Review list — GET /reviews/list?business_id=${TEST_BUSINESS_ID}`);
  const listRes  = await fetch(`${BASE}/reviews/list?business_id=${TEST_BUSINESS_ID}`);
  const listData = await listRes.json();
  if (!listRes.ok) {
    log(7, 'FAIL', 'GET /reviews/list failed', listData);
  } else {
    const reviews = listData.data?.reviews ?? [];
    listLengthAfterFirstSubmit = reviews.length;
    const hasDisplayName = reviews.some(r => r.display_name);
    const hasRating4     = reviews.some(r => r.rating === 4 || r.rating === 5); // may have been upserted already
    if (reviews.length >= 1 && hasDisplayName) {
      log(7, 'PASS', `Review list returned — ${reviews.length} row(s), display_name present`, {
        first: {
          rating:       reviews[0].rating,
          display_name: reviews[0].display_name,
          review_text:  reviews[0].review_text,
        },
      });
    } else {
      log(7, 'FAIL', 'List empty or display_name missing', { count: reviews.length, hasDisplayName });
    }
  }

  // ── Step 8: Rating breakdown ──────────────────────────────────
  // GET /reviews/breakdown is public. The submitted rating=4 must
  // appear in the breakdown with count ≥ 1 and a percentage > 0.
  log(8, 'INFO', `Rating breakdown — GET /reviews/breakdown?business_id=${TEST_BUSINESS_ID}`);
  const breakRes  = await fetch(`${BASE}/reviews/breakdown?business_id=${TEST_BUSINESS_ID}`);
  const breakData = await breakRes.json();
  if (!breakRes.ok) {
    log(8, 'FAIL', 'GET /reviews/breakdown failed', breakData);
  } else {
    const breakdown = breakData.data?.breakdown ?? [];
    const star4 = breakdown.find(b => b.rating === 4 || b.rating === 5);
    if (breakdown.length > 0 && star4 && star4.count >= 1 && star4.percentage > 0) {
      log(8, 'PASS', 'Breakdown returned with correct counts', { breakdown });
    } else {
      log(8, 'FAIL', 'Breakdown missing expected star entry or count is 0', { breakdown });
    }
  }

  // ── Step 9: Upsert — change rating to 5 ──────────────────────
  // Submitting again for the same user+business must update the
  // existing row (upsert). review_count must NOT increase.
  log(9, 'INFO', 'Upsert — resubmit with rating=5 (expect same review_count)');
  const countBefore = Number((await (await fetch(`${BASE}/reviews/summary?business_id=${TEST_BUSINESS_ID}`)).json()).data?.review_count ?? 0);

  const upsertRes  = await fetch(`${BASE}/reviews`, {
    method:  'POST',
    headers: authHeaders,
    body:    JSON.stringify({
      business_id: TEST_BUSINESS_ID,
      rating:      5,
      review_text: 'Even better — upserted by test-reviews-module.js.',
    }),
  });
  const upsertData = await upsertRes.json();
  if (upsertRes.status !== 201) {
    log(9, 'FAIL', `Expected 201 but got ${upsertRes.status}`, upsertData);
  } else {
    const countAfter = Number(upsertData.data?.review_count ?? 0);
    if (countAfter === countBefore) {
      log(9, 'PASS', 'Upsert confirmed — review_count unchanged, rating updated', {
        review_count:   countAfter,
        average_rating: upsertData.data.average_rating,
      });
    } else {
      log(9, 'FAIL', `review_count changed from ${countBefore} to ${countAfter} — insert instead of upsert`, upsertData.data);
    }
  }

  // ── Step 10: Upsert confirmed in list ────────────────────────
  // After upsert the review list must still have the same length
  // as after the first submit (no duplicate rows for this user).
  log(10, 'INFO', 'Upsert confirm — GET /reviews/list should not have grown');
  const list2Res  = await fetch(`${BASE}/reviews/list?business_id=${TEST_BUSINESS_ID}`);
  const list2Data = await list2Res.json();
  if (!list2Res.ok) {
    log(10, 'FAIL', 'GET /reviews/list failed on second call', list2Data);
  } else {
    const list2 = list2Data.data?.reviews ?? [];
    if (list2.length === listLengthAfterFirstSubmit) {
      log(10, 'PASS', `List length unchanged at ${list2.length} — no duplicate row inserted`);
    } else {
      log(10, 'FAIL', `List grew from ${listLengthAfterFirstSubmit} to ${list2.length} — upsert may have inserted instead`, {
        before: listLengthAfterFirstSubmit,
        after:  list2.length,
      });
    }
  }

  // ── Step 11: Non-subscriber guard ────────────────────────────
  // A user who is NOT subscribed to the business must receive 403
  // when they attempt to POST /reviews.
  log(11, 'INFO', `Non-subscriber guard — login as ${TEST_EMAIL_2} and POST /reviews (expect 403)`);
  const login2Res  = await fetch(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ identifier: TEST_EMAIL_2, password: TEST_PASSWORD_2 }),
  });
  const login2Data = await login2Res.json();
  if (!login2Res.ok) {
    log(11, 'INFO', `Could not log in as ${TEST_EMAIL_2} — skipping non-subscriber guard test`, login2Data);
  } else {
    accessToken2 = login2Data.data?.accessToken;
    const guard403Res  = await fetch(`${BASE}/reviews`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken2}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ business_id: TEST_BUSINESS_ID, rating: 3, review_text: 'Should be rejected.' }),
    });
    if (guard403Res.status === 403) {
      const guard403Data = await guard403Res.json();
      log(11, 'PASS', 'Non-subscriber correctly rejected with 403', { error: guard403Data.error });
    } else {
      const guard403Data = await guard403Res.json();
      log(11, 'FAIL', `Expected 403 but got ${guard403Res.status} — subscription gate not enforced`, guard403Data);
    }
  }

  // ── Step 12: Auth guard ───────────────────────────────────────
  // POST /reviews without an Authorization header must return 401.
  log(12, 'INFO', 'Auth guard — POST /reviews with no token (expect 401)');
  const unauthRes = await fetch(`${BASE}/reviews`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ business_id: TEST_BUSINESS_ID, rating: 3 }),
  });
  if (unauthRes.status === 401) {
    log(12, 'PASS', 'Unauthenticated request correctly rejected with 401');
  } else {
    log(12, 'FAIL', `Expected 401 but got ${unauthRes.status}`);
  }

  // ── Note: no delete step ──────────────────────────────────────
  // There is no DELETE /reviews endpoint yet. deleteRating() in
  // useBusinessRating.ts is a no-op stub. When a delete endpoint
  // is added, add step 13 here to verify cleanup.

  // ── Summary ───────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log('         Test Run Complete            ');
  console.log('══════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('\n❌ Unhandled error during test run:', err);
});
