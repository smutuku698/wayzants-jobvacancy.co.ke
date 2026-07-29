import { getEnv } from './env';

const PAYSTACK_BASE = 'https://api.paystack.co';

export interface ChargeParams {
  amountKes: number;
  email: string;
  /** Already normalized to +254XXXXXXXXX via normalizeKenyanPhone(). */
  phone: string;
  reference: string;
  metadata: Record<string, unknown>;
}

export interface ChargeResult {
  ok: boolean;
  status?: string;
  message?: string;
}

interface PaystackChargeResponse {
  status: boolean;
  message: string;
  data?: { status?: string };
}

/**
 * Initiates an M-Pesa STK push via Paystack's Charge API — fires the prompt
 * directly to the customer's phone without ever showing a Paystack-hosted
 * checkout page. Amount is always computed by the caller from a
 * server-validated pricing tier, never from client input.
 */
export async function initiateMpesaCharge(params: ChargeParams): Promise<ChargeResult> {
  const env = getEnv();
  const response = await fetch(`${PAYSTACK_BASE}/charge`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      // Paystack amounts are in the smallest currency unit (cents) across
      // every currency they support, including KES — this was verified
      // against Paystack's docs during research, but re-confirm with a
      // sandbox test charge before switching to the live secret key.
      amount: String(params.amountKes * 100),
      currency: 'KES',
      mobile_money: {
        phone: params.phone,
        provider: 'mpesa',
      },
      reference: params.reference,
      metadata: params.metadata,
    }),
  });

  const body = (await response.json().catch(() => null)) as PaystackChargeResponse | null;
  if (!response.ok || !body || body.status !== true) {
    return { ok: false, message: body?.message ?? `Paystack charge request failed (${response.status})` };
  }
  return { ok: true, status: body.data?.status };
}

/**
 * Directly asks Paystack whether a charge succeeded — a fallback safety net
 * for when the webhook is slow or never arrives (webhooks can be delayed or
 * dropped; never trust them as the only source of truth). Used by the
 * payments/status endpoint when our own DB still shows 'pending' after the
 * client has been polling for a while.
 */
export async function verifyCharge(reference: string): Promise<'success' | 'pending' | 'failed' | 'unknown'> {
  const env = getEnv();
  const response = await fetch(`${PAYSTACK_BASE}/charge/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });
  const body = (await response.json().catch(() => null)) as PaystackChargeResponse | null;
  if (!response.ok || !body?.data?.status) return 'unknown';
  if (body.data.status === 'success') return 'success';
  if (body.data.status === 'failed') return 'failed';
  return 'pending';
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Verifies the `x-paystack-signature` header — HMAC-SHA512 of the raw request body. */
export async function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;
  const env = getEnv();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.PAYSTACK_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = toHex(digest);

  if (expected.length !== signatureHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return diff === 0;
}
