import { config } from '../config';

export interface TokenExchangeResult {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
}

export interface TokenDebugInfo {
  appId: string;
  type: string;
  application: string;
  dataAccessExpiresAt?: number;
  expiresAt: number;
  isValid: boolean;
  scopes: string[];
  granularScopes?: Array<{
    scope: string;
    targetIds?: string[];
  }>;
  userId?: string;
}

export interface WabaPhoneNumber {
  id: string;
  verifiedName?: string;
  displayPhoneNumber?: string;
  qualityRating?: string;
}

/**
 * Exchange the short-lived OAuth authorization code returned by Meta's FB.login / Embedded Signup flow
 * for a System User / Delegated Access Token.
 */
export async function exchangeCodeForAccessToken(code: string): Promise<TokenExchangeResult> {
  const params = new URLSearchParams({
    client_id: config.metaAppId,
    client_secret: config.metaAppSecret,
    code,
  });

  const url = `${config.metaApiBase}/oauth/access_token?${params.toString()}`;
  console.log(`🔑 [Meta OAuth Exchange]: Requesting access token for code snippet ${code.slice(0, 8)}...`);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  const data: any = await response.json();

  if (!response.ok || data.error) {
    console.error('❌ [Meta OAuth Exchange Failed]:', data.error || data);
    throw new Error(data.error?.message || 'Failed to exchange Meta authorization code');
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type || 'bearer',
    expiresIn: data.expires_in,
  };
}

/**
 * Inspect an access token using Meta's debug_token endpoint.
 * This extracts granular scopes (including shared WABA IDs and Business Portfolio IDs).
 */
export async function debugToken(inputToken: string): Promise<TokenDebugInfo> {
  const appToken = `${config.metaAppId}|${config.metaAppSecret}`;
  const params = new URLSearchParams({
    input_token: inputToken,
    access_token: appToken,
  });

  const url = `${config.metaApiBase}/debug_token?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  const data: any = await response.json();

  if (!response.ok || data.error) {
    console.error('❌ [Meta Token Debug Failed]:', data.error || data);
    throw new Error(data.error?.message || 'Failed to debug Meta token');
  }

  const d = data.data;
  return {
    appId: d.app_id,
    type: d.type,
    application: d.application,
    dataAccessExpiresAt: d.data_access_expires_at,
    expiresAt: d.expires_at,
    isValid: d.is_valid,
    scopes: d.scopes || [],
    granularScopes: d.granular_scopes || [],
    userId: d.user_id,
  };
}

/**
 * Subscribe the Agency App to the client's WABA Webhooks.
 * This enables the agency server to receive messages and status callbacks for the client's phone numbers.
 */
export async function subscribeAppToWaba(wabaId: string, accessToken: string): Promise<boolean> {
  const url = `${config.metaApiBase}/${wabaId}/subscribed_apps`;
  console.log(`📡 [Meta Webhook Subscription]: Subscribing app to WABA ${wabaId}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data: any = await response.json();

  if (!response.ok || data.error) {
    console.error(`❌ [Meta Subscribed Apps Error for WABA ${wabaId}]:`, data.error || data);
    throw new Error(data.error?.message || `Failed to subscribe app to WABA ${wabaId}`);
  }

  console.log(`✅ [Meta Webhook Subscription Success]: WABA ${wabaId} subscribed (success=${data.success})`);
  return data.success === true;
}

/**
 * Fetch phone numbers associated with a WABA.
 */
export async function getWabaPhoneNumbers(wabaId: string, accessToken: string): Promise<WabaPhoneNumber[]> {
  const url = `${config.metaApiBase}/${wabaId}/phone_numbers?fields=id,verified_name,display_phone_number,quality_rating`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  const data: any = await response.json();

  if (!response.ok || data.error) {
    console.error(`❌ [Meta Phone Numbers Fetch Error for WABA ${wabaId}]:`, data.error || data);
    return [];
  }

  return (data.data || []).map((p: any) => ({
    id: p.id,
    verifiedName: p.verified_name,
    displayPhoneNumber: p.display_phone_number,
    qualityRating: p.quality_rating,
  }));
}
