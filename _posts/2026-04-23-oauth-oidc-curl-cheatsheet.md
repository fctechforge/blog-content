---
layout: post
title: OAuth/OIDC cURL Cheatsheet
date: '2026-04-23'
categories: []
tags: []
description: Compact reference article with reusable curl examples for the most common endpoints and flows.
---

# Intro

OAuth and OIDC flows are easy to understand in diagrams and easy to forget in exact HTTP form.

In practice, most debugging starts with one of these questions:

- what is the token request supposed to look like
- which endpoint should I call first
- does this client send a secret or not
- what does revocation or introspection look like again

This page is for those moments. It has evolved into a small OAuth/OIDC playground with matching `curl` commands. Use the buttons to test what can safely be tested from the browser, then use the `curl` blocks as the portable command reference.

# Explanation

If you want the page to tailor the commands for your provider, import the discovery metadata first.

The page will fetch the OIDC metadata in the browser and replace the endpoint variables in the existing commands below. Until then, the examples stay generic.

This helper is for reference and local testing only.

- do not treat this page as a production OAuth client
- do not store real confidential client secrets in frontend code or browser storage in real systems
- browser calls from this page may fail unless the authorization server allows CORS for the relevant endpoints

<div id="oidc-helper" class="mb-4">
  <p class="mb-2"><strong>Input your OIDC discovery endpoint</strong></p>
  <p class="small text-muted mb-3">Example: <code>https://auth.example.com/.well-known/openid-configuration</code></p>

  <label for="oidc-discovery-url">Discovery endpoint</label>
  <input id="oidc-discovery-url" class="form-control mb-3" type="url" placeholder="https://auth.example.com/.well-known/openid-configuration">

  <label for="oidc-client-id">Client ID</label>
  <input id="oidc-client-id" class="form-control mb-3" type="text" placeholder="demo-client">

  <label for="oidc-client-secret">Client secret (optional)</label>
  <input id="oidc-client-secret" class="form-control mb-3" type="text" placeholder="leave empty for public clients">

  <label for="oidc-scopes">Scopes</label>
  <input id="oidc-scopes" class="form-control mb-3" type="text" value="openid profile email">

  <label for="oidc-redirect-uri">Redirect URI</label>
  <input id="oidc-redirect-uri" class="form-control mb-3" type="text" value="http://127.0.0.1:8080/callback">

  <label for="oidc-api-base-url">Protected API base URL</label>
  <input id="oidc-api-base-url" class="form-control mb-3" type="text" value="https://api.example.com">

  <label for="oidc-post-logout-uri">Post logout redirect URI</label>
  <input id="oidc-post-logout-uri" class="form-control mb-3" type="text" value="https://app.example.com/post-logout">

  <div class="d-flex gap-2 flex-wrap mt-3">
    <button id="oidc-import-button" class="btn btn-primary btn-sm" type="button">Import</button>
    <button id="oidc-reset-button" class="btn btn-outline-secondary btn-sm" type="button">Reset</button>
  </div>

  <p id="oidc-helper-status" class="mt-3 mb-0 text-muted"></p>
</div>

<script src="{{ '/assets/js/oidc-cheatsheet-helper.js' | relative_url }}"></script>

# Flows and cURL commands

## Prerequisites

Steps below were tested on macOS arm64. Adjust for your platform if needed.

These commands assume you have:

- `curl`
- `jq`
- `openssl`

They also assume you already know your issuer URL and have a client configured on the authorization server.

## Discovery and metadata

Fetch OpenID Connect metadata:

```bash
curl -s "$OIDC_METADATA_URL" | jq
```

Fetch OAuth authorization server metadata if your provider exposes it separately:

```bash
curl -s "$OAUTH_METADATA_URL" | jq
```

Fetch the JSON Web Key Set used for token signature verification:

```bash
curl -s "$JWKS_URI" | jq
```

If discovery import fails in the browser, the most common reason is CORS. The authorization server may expose metadata correctly but still block this page from fetching it unless cross-origin requests are allowed.

## Authorization code flow without PKCE

This is the older authorization code variant typically used by confidential server-side web apps. The "Start Login" opens the login flow in a new browser window. Your browser may block the popup.

<button id="oidc-start-login-no-pkce-button" class="btn btn-outline-primary btn-sm" type="button">Start Login</button>
<button id="oidc-exchange-code-no-secret-button" class="btn btn-outline-primary btn-sm" type="button">Exchange Code Without Secret</button>
<button id="oidc-exchange-code-with-secret-button" class="btn btn-outline-primary btn-sm" type="button">Exchange Code With Secret</button>

<p id="oidc-helper-auth-code-row-no-pkce" class="mt-2 mb-0 d-none">
  Captured authorization code:
  <code id="oidc-helper-auth-code-no-pkce"></code>
</p>

<div id="oidc-helper-token-response-row-no-pkce" class="mt-2 d-none">
  <p class="mb-1">Token response payload:</p>
  <pre><code id="oidc-helper-token-response-no-pkce"></code></pre>
</div>

### URLs and cURL commands

Authorization URL:

```bash
$AUTHORIZATION_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$REDIRECT_URI&scope=openid%20profile%20email&state=demo-state&nonce=demo-nonce
```

Public client without client secret:

```bash
curl -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=$CLIENT_ID" \
  -d "redirect_uri=$REDIRECT_URI" \
  -d "code=$AUTH_CODE"
```

Confidential client with client secret (This confidential-client variant is shown for reference. Do not use the page itself to hold or protect production client secrets):

```bash
curl -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=$REDIRECT_URI" \
  -d "code=$AUTH_CODE"
```

## Authorization code flow with PKCE

This flow is for a public client that sends the user to the authorization server in a browser, receives an authorization code, and exchanges it for tokens.

<button id="oidc-start-login-pkce-button" class="btn btn-outline-primary btn-sm" type="button">Start PKCE Login</button>
<button id="oidc-exchange-code-pkce-no-secret-button" class="btn btn-outline-primary btn-sm" type="button">Exchange PKCE Code Without Secret</button>
<button id="oidc-exchange-code-pkce-with-secret-button" class="btn btn-outline-primary btn-sm" type="button">Exchange PKCE Code With Secret</button>


<p id="oidc-helper-auth-code-row-pkce" class="mt-2 mb-0 d-none">
  Captured authorization code:
  <code id="oidc-helper-auth-code-pkce"></code>
</p>


<div id="oidc-helper-token-response-row-pkce" class="mt-2 d-none">
  <p class="mb-1">Token response payload:</p>
  <pre><code id="oidc-helper-token-response-pkce"></code></pre>
</div>

### URLs and cURL commands

Generate a PKCE code verifier:

```bash
export CODE_VERIFIER="$(openssl rand -base64 64 | tr -d '=+/' | cut -c1-64)"
```

Generate the matching PKCE code challenge:

```bash
export CODE_CHALLENGE="$(printf '%s' "$CODE_VERIFIER" | openssl dgst -binary -sha256 | openssl base64 -A | tr '+/' '-_' | tr -d '=')"
```

Authorization URL:

```bash
$AUTHORIZATION_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$REDIRECT_URI&scope=openid%20profile%20email&code_challenge=$CODE_CHALLENGE&code_challenge_method=S256&state=demo-state&nonce=demo-nonce
```

Exchange the code for tokens as a public client without client secret:

```bash
curl -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=$CLIENT_ID" \
  -d "redirect_uri=$REDIRECT_URI" \
  -d "code=$AUTH_CODE" \
  -d "code_verifier=$CODE_VERIFIER"
```

Exchange the code for tokens as a confidential client with client secret (This confidential-client variant is shown for reference. Do not use the page itself to hold or protect production client secrets.)

```bash
curl -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=$REDIRECT_URI" \
  -d "code=$AUTH_CODE" \
  -d "code_verifier=$CODE_VERIFIER"
```

## Access Token Refresh

<button id="oidc-refresh-token-no-secret-button" class="btn btn-outline-primary btn-sm" type="button">Refresh Token Without Secret</button>
<button id="oidc-refresh-token-with-secret-button" class="btn btn-outline-primary btn-sm" type="button">Refresh Token With Secret</button>

<div id="oidc-helper-response-row-refresh" class="mt-2 d-none">
  <p class="mb-1">Refresh response payload:</p>
  <pre><code id="oidc-helper-response-refresh"></code></pre>
</div>

Refresh the access token as a public client without client secret:

```bash
curl -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "client_id=$CLIENT_ID" \
  -d "refresh_token=$REFRESH_TOKEN"
```

Refresh the access token as a confidential client with client secret:

```bash
curl -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=$REFRESH_TOKEN"
```

## Client credentials

This flow is for a confidential machine client calling an API without an end user.

Request an access token:

<button id="oidc-client-credentials-button" class="btn btn-outline-primary btn-sm" type="button">Request Client Credentials Token</button>

<div id="oidc-helper-response-row-client-credentials" class="mt-2 d-none">
  <p class="mb-1">Client credentials response payload:</p>
  <pre><code id="oidc-helper-response-client-credentials"></code></pre>
</div>

```bash
curl -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  -d "scope=api.read"
```

Call the API:

<button id="oidc-call-api-client-credentials-button" class="btn btn-outline-primary btn-sm" type="button">Call API With Current Token</button>

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$API_BASE_URL/resource"
```

## Introspection

Use introspection when the authorization server expects token status checks at runtime:

<button id="oidc-introspect-token-button" class="btn btn-outline-primary btn-sm" type="button">Introspect Access Token</button>

<div id="oidc-helper-response-row-introspection" class="mt-2 d-none">
  <p class="mb-1">Introspection response payload:</p>
  <pre><code id="oidc-helper-response-introspection"></code></pre>
</div>

```bash
curl -X POST "$INTROSPECTION_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "token=$ACCESS_TOKEN"
```

## UserInfo

Use the UserInfo endpoint when you have an OIDC access token and want the current user claims:

<button id="oidc-userinfo-button" class="btn btn-outline-primary btn-sm" type="button">Call UserInfo</button>

<div id="oidc-helper-response-row-userinfo" class="mt-2 d-none">
  <p class="mb-1">UserInfo response payload:</p>
  <pre><code id="oidc-helper-response-userinfo"></code></pre>
</div>

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$USERINFO_ENDPOINT"
```

## Device authorization flow

This flow is for a device or CLI that cannot complete a normal browser redirect flow itself.

### Test

Start the device authorization request:

<button id="oidc-device-start-button" class="btn btn-outline-primary btn-sm" type="button">Start Device Flow</button>

<div id="oidc-helper-response-row-device-start" class="mt-2 d-none">
  <p class="mb-1">Device authorization response payload:</p>
  <pre><code id="oidc-helper-response-device-start"></code></pre>
</div>

After the user completes verification, poll the token endpoint:

<button id="oidc-device-poll-button" class="btn btn-outline-primary btn-sm" type="button">Poll Device Token</button>

<p id="oidc-helper-device-code-row" class="mt-2 mb-0 d-none">
  Captured device code:
  <code id="oidc-helper-device-code"></code>
</p>

<div id="oidc-helper-response-row-device-poll" class="mt-2 d-none">
  <p class="mb-1">Device token response payload:</p>
  <pre><code id="oidc-helper-response-device-poll"></code></pre>
</div>

### URLs and cURL commands

```bash
curl -X POST "$DEVICE_AUTHORIZATION_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$CLIENT_ID" \
  -d "scope=openid profile email"
```

```bash
export DEVICE_CODE="$DEVICE_CODE"
```

```bash
curl -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:device_code" \
  -d "device_code=$DEVICE_CODE" \
  -d "client_id=$CLIENT_ID"
```

## Logout and session endpoints

Logout is usually browser-driven, but it is still useful to see the exact request shape.

Build an RP-initiated logout request:

<button id="oidc-open-logout-button" class="btn btn-outline-primary btn-sm" type="button">Open Logout URL</button>

```bash
printf '%s\n' \
"$END_SESSION_ENDPOINT?id_token_hint=$ID_TOKEN&post_logout_redirect_uri=$POST_LOGOUT_REDIRECT_URI"
```

Open the logout URL directly in the browser on macOS:

```bash
open "$END_SESSION_ENDPOINT?id_token_hint=$ID_TOKEN&post_logout_redirect_uri=$POST_LOGOUT_REDIRECT_URI"
```

## Revocation

Use revocation when you want to invalidate an access token.

<button id="oidc-revoke-token-button" class="btn btn-outline-primary btn-sm" type="button">Revoke Access Token</button>

<div id="oidc-helper-response-row-revocation" class="mt-2 d-none">
  <p class="mb-1">Revocation response payload:</p>
  <pre><code id="oidc-helper-response-revocation"></code></pre>
</div>

```bash
curl -X POST "$REVOCATION_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "token=$ACCESS_TOKEN" \
  -d "token_type_hint=access_token"
```

## PAR, DPoP, and token exchange

Push an authorization request to the PAR endpoint:

<button id="oidc-par-button" class="btn btn-outline-primary btn-sm" type="button">Push Authorization Request</button>

<div id="oidc-helper-response-row-par" class="mt-2 d-none">
  <p class="mb-1">PAR response payload:</p>
  <pre><code id="oidc-helper-response-par"></code></pre>
</div>

```bash
curl -X POST "$PAR_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "client_id=$CLIENT_ID" \
  -d "response_type=code" \
  -d "redirect_uri=$REDIRECT_URI" \
  -d "scope=openid profile" \
  -d "state=demo-state"
```

Send a token request with a DPoP proof header:

```bash
export DPOP_PROOF="replace-me"
```

```bash
curl -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "DPoP: $DPOP_PROOF" \
  -d "grant_type=authorization_code" \
  -d "client_id=$CLIENT_ID" \
  -d "code=$AUTH_CODE" \
  -d "redirect_uri=$REDIRECT_URI" \
  -d "code_verifier=$CODE_VERIFIER"
```

Exchange one token for another:

<button id="oidc-token-exchange-button" class="btn btn-outline-primary btn-sm" type="button">Exchange Token</button>

<div id="oidc-helper-response-row-token-exchange" class="mt-2 d-none">
  <p class="mb-1">Token exchange response payload:</p>
  <pre><code id="oidc-helper-response-token-exchange"></code></pre>
</div>

```bash
curl -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange" \
  -d "subject_token=$ACCESS_TOKEN" \
  -d "subject_token_type=urn:ietf:params:oauth:token-type:access_token" \
  -d "requested_token_type=urn:ietf:params:oauth:token-type:access_token"
```

Exchange one token on behalf of another actor:

```bash
export ACTOR_TOKEN="replace-me"
```

```bash
curl -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange" \
  -d "subject_token=$ACCESS_TOKEN" \
  -d "subject_token_type=urn:ietf:params:oauth:token-type:access_token" \
  -d "actor_token=$ACTOR_TOKEN" \
  -d "actor_token_type=urn:ietf:params:oauth:token-type:access_token" \
  -d "requested_token_type=urn:ietf:params:oauth:token-type:access_token"
```

## CIBA

CIBA is a backchannel authentication flow. The client starts authentication without redirecting the user through the browser on that same device.

Backchannel authentication request:

<button id="oidc-ciba-start-button" class="btn btn-outline-primary btn-sm" type="button">Start CIBA Request</button>

<div id="oidc-helper-response-row-ciba-start" class="mt-2 d-none">
  <p class="mb-1">CIBA response payload:</p>
  <pre><code id="oidc-helper-response-ciba-start"></code></pre>
</div>

```bash
curl -X POST "$ISSUER/backchannel-authentication" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "scope=openid profile" \
  -d "login_hint=user@example.com"
```

The response should include an `auth_req_id`. Export it before polling:

```bash
export AUTH_REQ_ID="replace-me"
```

Poll the token endpoint:

<button id="oidc-ciba-poll-button" class="btn btn-outline-primary btn-sm" type="button">Poll CIBA Token</button>

<div id="oidc-helper-response-row-ciba-poll" class="mt-2 d-none">
  <p class="mb-1">CIBA token response payload:</p>
  <pre><code id="oidc-helper-response-ciba-poll"></code></pre>
</div>

```bash
curl -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=urn:openid:params:grant-type:ciba" \
  -d "auth_req_id=$AUTH_REQ_ID"
```

## Example API Call with access token

<button id="oidc-call-api-button" class="btn btn-outline-primary btn-sm" type="button">Call Protected API</button>

<div id="oidc-helper-response-row-api" class="mt-2 d-none">
  <p class="mb-1">API response payload:</p>
  <pre><code id="oidc-helper-response-api"></code></pre>
</div>

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$API_BASE_URL/resource"
```
