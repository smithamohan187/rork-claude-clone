const crypto = require('crypto');
const { getClient } = require('../../config/database');
const couponsModel = require('./coupons.model');
const subscriptionModel = require('../subscriptions/subscription.model');
const notificationsService = require('../notifications/notifications.service');

async function getRedeemableRewards(userId, businessId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  const [rewards, balance] = await Promise.all([
    couponsModel.getActiveRewardsByBusiness(businessId),
    couponsModel.getBusinessPointsForProfile(profileId, businessId),
  ]);

  return rewards.map(r => ({
    id:                r.id,
    name:              r.name,
    description:       r.description,
    imageUrl:          r.image_url,
    type:              r.type,
    pointsRequired:    r.points_required,
    quantityAvailable: r.quantity_available,
    affordable:        balance >= r.points_required,
  }));
}

async function redeemReward(userId, businessId, rewardId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Re-verify balance server-side — never trust client
    const balRow = await client.query(
      `SELECT COALESCE(SUM(points), 0)::int AS bal
       FROM points_transactions
       WHERE profile_id = $1 AND business_id = $2`,
      [profileId, businessId]
    );
    const balance = balRow.rows[0].bal;

    const rewardRow = await client.query(
      `SELECT r.*, b.name AS business_name
       FROM rewards_catalog r
       JOIN businesses b ON b.id = r.business_id
       WHERE r.id = $1 AND r.business_id = $2 AND r.is_active = TRUE
       FOR UPDATE`,
      [rewardId, businessId]
    );
    if (!rewardRow.rows[0]) {
      throw Object.assign(new Error('Reward not found or inactive'), { status: 404 });
    }
    const reward = rewardRow.rows[0];

    if (balance < reward.points_required) {
      throw Object.assign(new Error('Insufficient points'), { status: 402 });
    }

    const segA = crypto.randomBytes(3).toString('hex').toUpperCase();
    const segB = Math.floor(1000 + Math.random() * 9000).toString();
    const code = `TP-${segA}-${segB}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const coupon = await couponsModel.createCouponWithClient(client, {
      profileId,
      businessId,
      rewardId,
      code,
      expiresAt,
      pointsCost: reward.points_required,
    });

    await couponsModel.insertRedemptionTransactionWithClient(client, {
      profileId,
      businessId,
      couponId: coupon.id,
      pointsCost: reward.points_required,
    });

    await notificationsService.createNotification(client, {
      profileId,
      type: 'reward_redeemed',
      title: 'Reward redeemed',
      body: `You redeemed ${reward.name} at ${reward.business_name}.`,
      data: { business_id: businessId, coupon_id: coupon.id, reward_id: rewardId },
    });

    await client.query('COMMIT');

    return {
      couponId:         coupon.id,
      couponCode:       coupon.code,
      expiresAt:        new Date(coupon.expires_at).getTime(),
      businessId,
      businessName:     reward.business_name,
      rewardName:       reward.name,
      rewardDescription: reward.description,
      rewardType:       reward.type,
      pointsRequired:   reward.points_required,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Server-side validation for a business owner scanning a customer's coupon (QR or manual code
// entry). Mirrors the states the frontend's old local-only CouponContext.redeemByPayload used to
// compute on-device: not_found / wrong_business / already_used / expired / success. Returns a
// result object rather than throwing for domain-level outcomes (matches redeemByPayload's shape)
// so the frontend's existing ResultOverlay switch needs no restructuring, only a real API call.
async function scanCoupon(userId, code) {
  const businessId = await couponsModel.getBusinessIdByUserId(userId);
  if (!businessId) throw Object.assign(new Error('No business found for this user'), { status: 400 });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const coupon = await couponsModel.getCouponByCodeForScan(client, code);
    if (!coupon) {
      await client.query('ROLLBACK');
      return { ok: false, error: 'not_found', message: 'This QR code is not valid.' };
    }

    if (coupon.business_id !== businessId) {
      await client.query('ROLLBACK');
      return { ok: false, error: 'wrong_business', message: 'This coupon is not valid for your business.' };
    }

    if (coupon.status === 'used') {
      await client.query('ROLLBACK');
      return {
        ok: false,
        error: 'already_used',
        message: 'This coupon has already been redeemed.',
        usedAt: new Date(coupon.used_at).getTime(),
      };
    }

    const now = new Date();
    if (coupon.status === 'expired' || new Date(coupon.expires_at) <= now) {
      if (coupon.status !== 'expired') {
        await couponsModel.markCouponExpiredWithClient(client, coupon.id);
        await couponsModel.insertRefundTransactionWithClient(client, {
          profileId: coupon.profile_id,
          businessId: coupon.business_id,
          couponId: coupon.id,
          pointsCost: coupon.points_cost,
        });
      }
      await client.query('COMMIT');
      return {
        ok: false,
        error: 'expired',
        message: 'This coupon expired.',
        expiredAt: new Date(coupon.expires_at).getTime(),
      };
    }

    await couponsModel.markCouponUsedWithClient(client, coupon.id);
    await client.query('COMMIT');

    return {
      ok: true,
      coupon: {
        id: coupon.id,
        customerName: coupon.customer_name,
        rewardTitle: coupon.reward_name,
        rewardType: coupon.reward_type,
        pointsDeducted: coupon.points_cost,
        usedAt: now.getTime(),
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function checkAndExpireCoupon(couponId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM coupons WHERE id = $1 FOR UPDATE',
      [couponId]
    );
    const coupon = rows[0];
    if (!coupon) throw Object.assign(new Error('Coupon not found'), { status: 404 });

    // Idempotent: if already expired or used, return immediately — no additional transaction
    if (coupon.status !== 'active' || new Date() <= new Date(coupon.expires_at)) {
      await client.query('COMMIT');
      return { expired: false, coupon };
    }

    await couponsModel.markCouponExpiredWithClient(client, couponId);
    await couponsModel.insertRefundTransactionWithClient(client, {
      profileId:   coupon.profile_id,
      businessId:  coupon.business_id,
      couponId,
      pointsCost:  coupon.points_cost,
    });

    await client.query('COMMIT');
    return { expired: true, coupon: { ...coupon, status: 'expired' } };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function confirmCouponUsed(couponId) {
  const coupon = await couponsModel.getCouponById(couponId);
  if (!coupon) throw Object.assign(new Error('Coupon not found'), { status: 404 });
  if (coupon.status !== 'active') {
    throw Object.assign(new Error(`Coupon is already ${coupon.status}`), { status: 409 });
  }
  await couponsModel.markCouponUsed(couponId);
  return { coupon: { ...coupon, status: 'used' } };
}

module.exports = { getRedeemableRewards, redeemReward, scanCoupon, checkAndExpireCoupon, confirmCouponUsed };
