// scripts/test-business-dashboard-module.js
// Dashboard summary endpoint test — verifies counts update correctly after
// subscribe/unsubscribe, offer create/disable, and event create/cancel.

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE              = 'http://localhost:3000';
const OWNER_EMAIL       = process.env.OWNER_EMAIL    || 'pinky@test.com';
const OWNER_PASSWORD    = process.env.OWNER_PASSWORD || 'Pinky123#';
const CUSTOMER_EMAIL    = process.env.CUSTOMER_EMAIL    || 'customer@test.com';
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD || 'Customer123#';

function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data) console.log('   ', JSON.stringify(data, null, 2));
}

async function run() {
  let ownerToken    = '';
  let customerToken = '';
  let businessId    = '';
  let offerId       = '';
  let eventId       = '';

  console.log('\n══════════════════════════════════════════');
  console.log('  TouchPoints Business Dashboard Test     ');
  console.log('══════════════════════════════════════════');
  console.log(`  Owner:    ${OWNER_EMAIL}`);
  console.log(`  Customer: ${CUSTOMER_EMAIL}`);

  // ── Step 1: Login as business owner ──────────────────────────────
  log(1, 'INFO', `Logging in as owner: ${OWNER_EMAIL}`);
  const loginOwner = await fetch(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ identifier: OWNER_EMAIL, password: OWNER_PASSWORD }),
  });
  const ownerData = await loginOwner.json();
  if (!loginOwner.ok) {
    log(1, 'FAIL', 'Owner login failed — aborting', ownerData);
    return;
  }
  ownerToken = ownerData.data?.accessToken;
  log(1, 'PASS', 'Owner login success');

  const ownerHeaders = {
    Authorization:  `Bearer ${ownerToken}`,
    'Content-Type': 'application/json',
  };

  // ── Step 2: Fetch initial dashboard summary ───────────────────────
  log(2, 'INFO', 'Fetching initial dashboard summary — GET /businesses/me/dashboard-summary');
  const summaryRes1 = await fetch(`${BASE}/businesses/me/dashboard-summary`, {
    headers: ownerHeaders,
  });
  const summaryData1 = await summaryRes1.json();
  if (!summaryRes1.ok || !summaryData1.data) {
    log(2, 'FAIL', 'Dashboard summary request failed', summaryData1);
    return;
  }
  const initial = summaryData1.data;
  log(2, 'PASS', 'Got initial counts', initial);

  // ── Step 3: Resolve the owner's businessId for subscription tests ─
  log(3, 'INFO', 'Fetching owner business id — GET /businesses/me');
  const myBizRes = await fetch(`${BASE}/businesses/me`, { headers: ownerHeaders });
  const myBizData = await myBizRes.json();
  if (!myBizRes.ok || !myBizData.data?.id) {
    log(3, 'FAIL', 'Could not resolve businessId — aborting', myBizData);
    return;
  }
  businessId = myBizData.data.id;
  log(3, 'PASS', `businessId = ${businessId}`);

  // ── Step 4: Login as customer ─────────────────────────────────────
  log(4, 'INFO', `Logging in as customer: ${CUSTOMER_EMAIL}`);
  const loginCustomer = await fetch(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ identifier: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
  });
  const custData = await loginCustomer.json();
  if (!loginCustomer.ok) {
    log(4, 'FAIL', 'Customer login failed — skipping subscription tests', custData);
  } else {
    customerToken = custData.data?.accessToken;
    log(4, 'PASS', 'Customer login success');

    const custHeaders = {
      Authorization:  `Bearer ${customerToken}`,
      'Content-Type': 'application/json',
    };

    // ── Step 5: Subscribe customer to owner's business ────────────────
    log(5, 'INFO', `Customer subscribing to business ${businessId}`);
    const subRes = await fetch(`${BASE}/subscriptions/subscribe`, {
      method:  'POST',
      headers: custHeaders,
      body:    JSON.stringify({ business_id: businessId }),
    });
    const subData = await subRes.json();
    if (!subRes.ok) {
      log(5, 'FAIL', 'Subscribe failed', subData);
    } else {
      log(5, 'PASS', 'Subscribed');

      // ── Step 6: Verify subscriber_count incremented ─────────────────
      const summaryRes2 = await fetch(`${BASE}/businesses/me/dashboard-summary`, { headers: ownerHeaders });
      const summaryData2 = await summaryRes2.json();
      const after = summaryData2.data;
      if (after.subscriber_count > initial.subscriber_count) {
        log(6, 'PASS', `subscriber_count incremented: ${initial.subscriber_count} → ${after.subscriber_count}`);
      } else {
        log(6, 'FAIL', `subscriber_count did not increment (was ${initial.subscriber_count}, now ${after.subscriber_count})`, after);
      }

      // ── Step 7: Unsubscribe customer ──────────────────────────────────
      log(7, 'INFO', 'Customer unsubscribing');
      const unsubRes = await fetch(`${BASE}/subscriptions/unsubscribe`, {
        method:  'POST',
        headers: custHeaders,
        body:    JSON.stringify({ business_id: businessId }),
      });
      if (!unsubRes.ok) {
        log(7, 'FAIL', 'Unsubscribe failed', await unsubRes.json());
      } else {
        log(7, 'PASS', 'Unsubscribed');

        // ── Step 8: Verify subscriber_count decremented ─────────────────
        const summaryRes3 = await fetch(`${BASE}/businesses/me/dashboard-summary`, { headers: ownerHeaders });
        const after2 = (await summaryRes3.json()).data;
        if (after2.subscriber_count === initial.subscriber_count) {
          log(8, 'PASS', `subscriber_count back to ${after2.subscriber_count}`);
        } else {
          log(8, 'FAIL', `subscriber_count mismatch after unsubscribe (expected ${initial.subscriber_count}, got ${after2.subscriber_count})`);
        }
      }
    }
  }

  // ── Step 9: Create an active offer ───────────────────────────────
  const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  log(9, 'INFO', 'Creating active offer — POST /offers');
  const createOfferRes = await fetch(`${BASE}/offers`, {
    method:  'POST',
    headers: ownerHeaders,
    body: JSON.stringify({
      title:           'Dashboard Test Offer',
      description:     'Created by test-business-dashboard-module.js',
      discount_type:   'percent',
      discount_value:  10,
      original_price:  100,
      starts_at:       new Date().toISOString(),
      expires_at:      futureExpiry,
      status:          'active',
    }),
  });
  const offerData = await createOfferRes.json();
  if (createOfferRes.status !== 201 || !offerData.data?.offer?.id) {
    log(9, 'FAIL', 'Create offer failed', offerData);
  } else {
    offerId = offerData.data.offer.id;
    log(9, 'PASS', `Offer created (id=${offerId})`);

    // ── Step 10: Verify active_offer_count incremented ───────────────
    const summaryRes4 = await fetch(`${BASE}/businesses/me/dashboard-summary`, { headers: ownerHeaders });
    const after3 = (await summaryRes4.json()).data;
    if (after3.active_offer_count > initial.active_offer_count) {
      log(10, 'PASS', `active_offer_count incremented: ${initial.active_offer_count} → ${after3.active_offer_count}`);
    } else {
      log(10, 'FAIL', `active_offer_count did not increment (was ${initial.active_offer_count}, now ${after3.active_offer_count})`);
    }

    // ── Step 11: Disable the offer ────────────────────────────────────
    log(11, 'INFO', `Disabling offer ${offerId} — PATCH /offers/${offerId}/toggle`);
    const toggleRes = await fetch(`${BASE}/offers/${offerId}/toggle`, {
      method:  'PATCH',
      headers: ownerHeaders,
    });
    if (!toggleRes.ok) {
      log(11, 'FAIL', 'Toggle offer failed', await toggleRes.json());
    } else {
      log(11, 'PASS', 'Offer disabled');

      // ── Step 12: Verify active_offer_count decremented ───────────────
      const summaryRes5 = await fetch(`${BASE}/businesses/me/dashboard-summary`, { headers: ownerHeaders });
      const after4 = (await summaryRes5.json()).data;
      if (after4.active_offer_count === initial.active_offer_count) {
        log(12, 'PASS', `active_offer_count back to ${after4.active_offer_count}`);
      } else {
        log(12, 'FAIL', `active_offer_count mismatch after disable (expected ${initial.active_offer_count}, got ${after4.active_offer_count})`);
      }
    }
  }

  // ── Step 13: Create an upcoming event ────────────────────────────
  const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  log(13, 'INFO', 'Creating upcoming event — POST /events');
  const createEventRes = await fetch(`${BASE}/events`, {
    method:  'POST',
    headers: ownerHeaders,
    body: JSON.stringify({
      title:       'Dashboard Test Event',
      description: 'Created by test-business-dashboard-module.js',
      starts_at:   futureStart,
    }),
  });
  const eventData = await createEventRes.json();
  if (createEventRes.status !== 201 || !eventData.data?.event?.id) {
    log(13, 'FAIL', 'Create event failed', eventData);
  } else {
    eventId = eventData.data.event.id;
    log(13, 'PASS', `Event created (id=${eventId})`);

    // ── Step 14: Verify upcoming_event_count incremented ─────────────
    const summaryRes6 = await fetch(`${BASE}/businesses/me/dashboard-summary`, { headers: ownerHeaders });
    const after5 = (await summaryRes6.json()).data;
    if (after5.upcoming_event_count > initial.upcoming_event_count) {
      log(14, 'PASS', `upcoming_event_count incremented: ${initial.upcoming_event_count} → ${after5.upcoming_event_count}`);
    } else {
      log(14, 'FAIL', `upcoming_event_count did not increment (was ${initial.upcoming_event_count}, now ${after5.upcoming_event_count})`);
    }

    // ── Step 15: Cancel the event ─────────────────────────────────────
    log(15, 'INFO', `Cancelling event ${eventId} — PATCH /events/${eventId}/cancel`);
    const cancelRes = await fetch(`${BASE}/events/${eventId}/cancel`, {
      method:  'PATCH',
      headers: ownerHeaders,
    });
    if (!cancelRes.ok) {
      log(15, 'FAIL', 'Cancel event failed', await cancelRes.json());
    } else {
      log(15, 'PASS', 'Event cancelled');

      // ── Step 16: Verify upcoming_event_count decremented ─────────────
      const summaryRes7 = await fetch(`${BASE}/businesses/me/dashboard-summary`, { headers: ownerHeaders });
      const after6 = (await summaryRes7.json()).data;
      if (after6.upcoming_event_count === initial.upcoming_event_count) {
        log(16, 'PASS', `upcoming_event_count back to ${after6.upcoming_event_count}`);
      } else {
        log(16, 'FAIL', `upcoming_event_count mismatch after cancel (expected ${initial.upcoming_event_count}, got ${after6.upcoming_event_count})`);
      }
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log('  Dashboard module test complete           ');
  console.log('══════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
