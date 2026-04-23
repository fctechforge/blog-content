(function () {
  const STORAGE_KEY = "oidc-cheatsheet-helper";
  const METADATA_STORAGE_KEY = "oidc-cheatsheet-helper-metadata";
  const AUTH_CODE_STORAGE_KEY = "oidc-cheatsheet-auth-code";
  const CODE_VERIFIER_STORAGE_KEY = "oidc-cheatsheet-code-verifier";
  const TOKEN_RESPONSE_STORAGE_KEY = "oidc-cheatsheet-token-response";
  const originalCode = new WeakMap();

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(message, isError) {
    const node = byId("oidc-helper-status");
    if (!node) return;
    node.textContent = message;
    node.className = isError ? "mt-3 mb-0 text-danger" : "mt-3 mb-0 text-muted";
  }

  function formNodes() {
    return {
      discovery: byId("oidc-discovery-url"),
      clientId: byId("oidc-client-id"),
      clientSecret: byId("oidc-client-secret"),
      scopes: byId("oidc-scopes"),
      redirectUri: byId("oidc-redirect-uri"),
      apiBaseUrl: byId("oidc-api-base-url"),
      postLogoutRedirectUri: byId("oidc-post-logout-uri")
    };
  }

  function defaultFormValues() {
    return {
      discoveryUrl: "",
      clientId: "",
      clientSecret: "",
      scopes: "openid profile email",
      redirectUri: currentPageUrl(),
      apiBaseUrl: "https://api.example.com",
      postLogoutRedirectUri: "https://app.example.com/post-logout"
    };
  }

  function currentPageUrl() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  function saveFormValues(values) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  }

  function loadFormValues() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultFormValues();
      return Object.assign(defaultFormValues(), JSON.parse(raw));
    } catch (_error) {
      return defaultFormValues();
    }
  }

  function clearFormValues() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function loadAuthCode() {
    return window.sessionStorage.getItem(AUTH_CODE_STORAGE_KEY) || "";
  }

  function saveAuthCode(code) {
    if (code) {
      window.sessionStorage.setItem(AUTH_CODE_STORAGE_KEY, code);
    }
  }

  function clearAuthCode() {
    window.sessionStorage.removeItem(AUTH_CODE_STORAGE_KEY);
  }

  function loadCodeVerifier() {
    return window.sessionStorage.getItem(CODE_VERIFIER_STORAGE_KEY) || "";
  }

  function saveCodeVerifier(verifier) {
    if (verifier) {
      window.sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, verifier);
    }
  }

  function clearCodeVerifier() {
    window.sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
  }

  function loadTokenResponse() {
    try {
      const raw = window.sessionStorage.getItem(TOKEN_RESPONSE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }

  function saveTokenResponse(response) {
    window.sessionStorage.setItem(TOKEN_RESPONSE_STORAGE_KEY, JSON.stringify(response));
  }

  function clearTokenResponse() {
    window.sessionStorage.removeItem(TOKEN_RESPONSE_STORAGE_KEY);
  }

  function saveMetadata(values) {
    window.localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(values));
  }

  function loadMetadata() {
    try {
      const raw = window.localStorage.getItem(METADATA_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function clearMetadata() {
    window.localStorage.removeItem(METADATA_STORAGE_KEY);
  }

  function applyFormValues(values) {
    const nodes = formNodes();
    if (nodes.discovery) nodes.discovery.value = values.discoveryUrl || "";
    if (nodes.clientId) nodes.clientId.value = values.clientId || "";
    if (nodes.clientSecret) nodes.clientSecret.value = values.clientSecret || "";
    if (nodes.scopes) nodes.scopes.value = values.scopes || defaultFormValues().scopes;
    if (nodes.redirectUri) nodes.redirectUri.value = values.redirectUri || defaultFormValues().redirectUri;
    if (nodes.apiBaseUrl) nodes.apiBaseUrl.value = values.apiBaseUrl || defaultFormValues().apiBaseUrl;
    if (nodes.postLogoutRedirectUri) nodes.postLogoutRedirectUri.value = values.postLogoutRedirectUri || defaultFormValues().postLogoutRedirectUri;
  }

  function setCapturedCodeDisplay(code) {
    const row = byId("oidc-helper-auth-code-row");
    const node = byId("oidc-helper-auth-code");
    if (!row || !node) return;
    if (code) {
      node.textContent = code;
      row.classList.remove("d-none");
    } else {
      node.textContent = "";
      row.classList.add("d-none");
    }
  }

  function issuerFromDiscovery(url) {
    return url.replace(/\/\.well-known\/openid-configuration.*$/, "");
  }

  function articleCodeNodes() {
    const blockNodes = Array.from(document.querySelectorAll("main .content .highlight .rouge-code pre"));
    const plainNodes = Array.from(document.querySelectorAll("main .content > pre > code"));
    return blockNodes.concat(plainNodes);
  }

  function ensureOriginals(nodes) {
    nodes.forEach(function (node) {
      if (!originalCode.has(node)) {
        originalCode.set(node, node.textContent);
      }
    });
  }

  function replaceAll(text, replacements) {
    return replacements.reduce(function (result, entry) {
      return result.split(entry.from).join(entry.to);
    }, text);
  }

  function buildReplacements(values) {
    const authCode = loadAuthCode();
    const codeVerifier = loadCodeVerifier();
    const tokenResponse = loadTokenResponse();
    const replacements = [
      { from: "https://auth.example.com/.well-known/openid-configuration", to: values.discoveryUrl },
      { from: "https://auth.example.com", to: values.issuer },
      { from: "https://api.example.com", to: values.apiBaseUrl },
      { from: "demo-client", to: values.clientId },
      { from: "http://127.0.0.1:8080/callback", to: values.redirectUri },
      { from: "https://app.example.com/post-logout", to: values.postLogoutRedirectUri },
      { from: "$OIDC_METADATA_URL", to: values.discoveryUrl },
      { from: "$OAUTH_METADATA_URL", to: values.oauthMetadataUrl },
      { from: "$JWKS_URI", to: values.jwksUri },
      { from: "$AUTHORIZATION_ENDPOINT", to: values.authorizationEndpoint },
      { from: "$TOKEN_ENDPOINT", to: values.tokenEndpoint },
      { from: "$USERINFO_ENDPOINT", to: values.userinfoEndpoint },
      { from: "$INTROSPECTION_ENDPOINT", to: values.introspectionEndpoint },
      { from: "$REVOCATION_ENDPOINT", to: values.revocationEndpoint },
      { from: "$DEVICE_AUTHORIZATION_ENDPOINT", to: values.deviceAuthorizationEndpoint },
      { from: "$PAR_ENDPOINT", to: values.parEndpoint },
      { from: "$END_SESSION_ENDPOINT", to: values.endSessionEndpoint },
      { from: "$CLIENT_ID", to: values.clientId },
      { from: "openid profile email", to: values.scopes || "openid profile email" },
      { from: "$REDIRECT_URI", to: values.redirectUri },
      { from: "$API_BASE_URL", to: values.apiBaseUrl },
      { from: "$POST_LOGOUT_REDIRECT_URI", to: values.postLogoutRedirectUri },
      { from: "$CLIENT_SECRET", to: values.clientSecret || "$CLIENT_SECRET" },
      { from: "$AUTH_CODE", to: authCode || "$AUTH_CODE" },
      { from: "$CODE_VERIFIER", to: codeVerifier || "$CODE_VERIFIER" },
      { from: "$ACCESS_TOKEN", to: tokenResponse.access_token || "$ACCESS_TOKEN" },
      { from: "$REFRESH_TOKEN", to: tokenResponse.refresh_token || "$REFRESH_TOKEN" },
      { from: "$ID_TOKEN", to: tokenResponse.id_token || "$ID_TOKEN" }
    ];

    return replacements
      .filter(function (entry) { return entry.to; })
      .sort(function (a, b) { return b.from.length - a.from.length; });
  }

  function applyValues(values) {
    const nodes = articleCodeNodes();
    ensureOriginals(nodes);
    const replacements = buildReplacements(values);

    nodes.forEach(function (node) {
      const original = originalCode.get(node) || node.textContent;
      node.textContent = replaceAll(original, replacements);
    });
  }

  function resetValues() {
    applyFormValues(defaultFormValues());
    clearFormValues();
    clearMetadata();
    clearAuthCode();
    clearCodeVerifier();
    clearTokenResponse();
    setCapturedCodeDisplay("");
    articleCodeNodes().forEach(function (node) {
      const original = originalCode.get(node);
      if (original) {
        node.textContent = original;
      }
    });
    setStatus("Inputs, captured auth code, and commands reset to the generic version.", false);
  }

  function consumeAuthCodeFromUrl() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (code) {
      saveAuthCode(code);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      url.searchParams.delete("session_state");
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
      if (window.opener && window.opener !== window) {
        try {
          window.opener.postMessage({ type: "oidc-helper-code", code: code }, window.location.origin);
          window.close();
        } catch (_error) {
          // Keep the page usable even if popup messaging is blocked.
        }
      }
      return { codeCaptured: true, error: "" };
    }

    if (error) {
      return { codeCaptured: false, error };
    }

    return { codeCaptured: false, error: "" };
  }

  async function importDiscovery() {
    const nodes = formNodes();
    const discoveryNode = nodes.discovery;
    const clientIdNode = nodes.clientId;
    const clientSecretNode = nodes.clientSecret;
    const scopesNode = nodes.scopes;
    const redirectUriNode = nodes.redirectUri;
    const apiBaseUrlNode = nodes.apiBaseUrl;
    const postLogoutNode = nodes.postLogoutRedirectUri;

    if (!discoveryNode || !clientIdNode || !redirectUriNode || !apiBaseUrlNode || !postLogoutNode || !clientSecretNode || !scopesNode) {
      return;
    }

    const discoveryUrl = discoveryNode.value.trim();
    const clientId = clientIdNode.value.trim() || "demo-client";
    const clientSecret = clientSecretNode.value.trim();
    const scopes = scopesNode.value.trim() || "openid profile email";
    const redirectUri = redirectUriNode.value.trim() || "http://127.0.0.1:8080/callback";
    const apiBaseUrl = apiBaseUrlNode.value.trim() || "https://api.example.com";
    const postLogoutRedirectUri = postLogoutNode.value.trim() || "https://app.example.com/post-logout";

    if (!discoveryUrl) {
      setStatus("Enter a discovery endpoint first.", true);
      return;
    }

    setStatus("Fetching discovery metadata...", false);

    try {
      const response = await fetch(discoveryUrl, { headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const metadata = await response.json();
      const issuer = metadata.issuer || issuerFromDiscovery(discoveryUrl);
      const values = {
        discoveryUrl,
        clientId,
        clientSecret,
        scopes,
        redirectUri,
        apiBaseUrl,
        postLogoutRedirectUri,
        issuer,
        oauthMetadataUrl: `${issuer}/.well-known/oauth-authorization-server`,
        authorizationEndpoint: metadata.authorization_endpoint || `${issuer}/authorize`,
        tokenEndpoint: metadata.token_endpoint || `${issuer}/token`,
        userinfoEndpoint: metadata.userinfo_endpoint || `${issuer}/userinfo`,
        introspectionEndpoint: metadata.introspection_endpoint || `${issuer}/introspect`,
        revocationEndpoint: metadata.revocation_endpoint || `${issuer}/revoke`,
        deviceAuthorizationEndpoint: metadata.device_authorization_endpoint || `${issuer}/device_authorization`,
        parEndpoint: metadata.pushed_authorization_request_endpoint || `${issuer}/par`,
        jwksUri: metadata.jwks_uri || `${issuer}/.well-known/jwks.json`,
        endSessionEndpoint: metadata.end_session_endpoint || `${issuer}/logout`
      };

      saveFormValues({
        discoveryUrl,
        clientId,
        clientSecret,
        scopes,
        redirectUri,
        apiBaseUrl,
        postLogoutRedirectUri
      });
      saveMetadata(values);
      applyValues(values);
      setStatus("Metadata imported. The commands below now use your provider endpoints where they can.", false);
    } catch (error) {
      setStatus(
        `Could not fetch discovery metadata. This is usually a bad URL, a browser CORS restriction, or a provider that does not expose discovery publicly. (${error.message})`,
        true
      );
    }
  }

  function randomString(length) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, function (byte) {
      return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~".charAt(byte % 66);
    }).join("");
  }

  async function sha256Base64Url(input) {
    const data = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    const bytes = Array.from(new Uint8Array(digest));
    const binary = String.fromCharCode.apply(null, bytes);
    return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  async function startPkceLogin() {
    const metadata = loadMetadata();
    const formValues = loadFormValues();

    if (!metadata || !metadata.authorizationEndpoint) {
      setStatus("Import discovery metadata first. The popup flow needs a resolved authorization endpoint.", true);
      return;
    }

    const clientId = formValues.clientId || "demo-client";
    const scopes = formValues.scopes || "openid profile email";
    const redirectUri = formValues.redirectUri || currentPageUrl();
    const verifier = randomString(64);
    const challenge = await sha256Base64Url(verifier);
    const state = randomString(24);
    const nonce = randomString(24);

    saveCodeVerifier(verifier);
    saveFormValues(
      Object.assign({}, formValues, {
        redirectUri: redirectUri
      })
    );

    const authorizationUrl = new URL(metadata.authorizationEndpoint);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("scope", scopes);
    authorizationUrl.searchParams.set("code_challenge", challenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("nonce", nonce);

    applyValues(metadata);

    const popup = window.open(
      authorizationUrl.toString(),
      "oidc-helper-login",
      "popup=yes,width=540,height=720,resizable=yes,scrollbars=yes"
    );

    if (!popup) {
      setStatus("Popup blocked. Allow popups for this page or open the authorization URL manually.", true);
      return;
    }

    setStatus("Popup opened. Complete login there and this page will capture the authorization code.", false);
  }

  async function exchangeAuthorizationCode(usePkce) {
    const metadata = loadMetadata();
    const formValues = loadFormValues();
    const authCode = loadAuthCode();
    const codeVerifier = loadCodeVerifier();

    if (!metadata || !metadata.tokenEndpoint) {
      setStatus("Import discovery metadata first. The token endpoint must be known before exchanging the code.", true);
      return;
    }

    if (!authCode) {
      setStatus("No authorization code is available yet. Start the login flow first.", true);
      return;
    }

    if (usePkce && !codeVerifier) {
      setStatus("No PKCE code verifier is available. Start the PKCE login flow first.", true);
      return;
    }

    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("client_id", formValues.clientId || "demo-client");
    body.set("redirect_uri", formValues.redirectUri || currentPageUrl());
    body.set("code", authCode);
    if (usePkce) {
      body.set("code_verifier", codeVerifier);
    }

    setStatus("Exchanging authorization code at the token endpoint...", false);

    const response = await fetch(metadata.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    const payload = await response.json().catch(async function () {
      return { raw: await response.text() };
    });

    if (!response.ok) {
      setStatus(`Token exchange failed. The provider may require different client settings or CORS for the token endpoint. (${response.status})`, true);
      return;
    }

    saveTokenResponse(payload);
    const latestMetadata = loadMetadata();
    if (latestMetadata) {
      latestMetadata.clientId = formValues.clientId || latestMetadata.clientId || "demo-client";
      latestMetadata.clientSecret = formValues.clientSecret || latestMetadata.clientSecret || "";
      latestMetadata.redirectUri = formValues.redirectUri || latestMetadata.redirectUri || currentPageUrl();
      latestMetadata.apiBaseUrl = formValues.apiBaseUrl || latestMetadata.apiBaseUrl || "https://api.example.com";
      latestMetadata.postLogoutRedirectUri = formValues.postLogoutRedirectUri || latestMetadata.postLogoutRedirectUri || "https://app.example.com/post-logout";
      applyValues(latestMetadata);
    }
    setStatus("Token response captured. The downstream commands below now use the returned tokens where applicable.", false);
  }

  function startLogin(usePkce) {
    const metadata = loadMetadata();
    const formValues = loadFormValues();

    if (!metadata || !metadata.authorizationEndpoint) {
      setStatus("Import discovery metadata first. The popup flow needs a resolved authorization endpoint.", true);
      return Promise.resolve();
    }

    const clientId = formValues.clientId || "demo-client";
    const scopes = formValues.scopes || "openid profile email";
    const redirectUri = formValues.redirectUri || currentPageUrl();
    const state = randomString(24);
    const nonce = randomString(24);

    saveFormValues(
      Object.assign({}, formValues, {
        redirectUri: redirectUri
      })
    );

    const authorizationUrl = new URL(metadata.authorizationEndpoint);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("scope", scopes);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("nonce", nonce);

    if (usePkce) {
      return startPkceLogin();
    }

    clearCodeVerifier();
    applyValues(metadata);

    const popup = window.open(
      authorizationUrl.toString(),
      "oidc-helper-login",
      "popup=yes,width=540,height=720,resizable=yes,scrollbars=yes"
    );

    if (!popup) {
      setStatus("Popup blocked. Allow popups for this page or open the authorization URL manually.", true);
      return Promise.resolve();
    }

    setStatus("Popup opened. Complete login there and this page will capture the authorization code.", false);
    return Promise.resolve();
  }

  function handlePopupMessage(event) {
    if (event.origin !== window.location.origin) {
      return;
    }

    if (!event.data || event.data.type !== "oidc-helper-code" || !event.data.code) {
      return;
    }

    saveAuthCode(event.data.code);
    setCapturedCodeDisplay(event.data.code);
    const metadata = loadMetadata();
    if (metadata) {
      applyValues(metadata);
    }
    setStatus("Authorization code captured from the popup. The token exchange command below now uses it.", false);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const importButton = byId("oidc-import-button");
    const startLoginNoPkceButton = byId("oidc-start-login-no-pkce-button");
    const startLoginButton = byId("oidc-start-login-pkce-button");
    const exchangeCodeNoSecretButton = byId("oidc-exchange-code-no-secret-button");
    const exchangeCodePkceNoSecretButton = byId("oidc-exchange-code-pkce-no-secret-button");
    const resetButton = byId("oidc-reset-button");
    const nodes = articleCodeNodes();
    ensureOriginals(nodes);
    const storedValues = loadFormValues();
    if (!storedValues.redirectUri) {
      storedValues.redirectUri = currentPageUrl();
    }
    applyFormValues(storedValues);

    const captureResult = consumeAuthCodeFromUrl();
    const metadata = loadMetadata();
    if (metadata) {
      metadata.clientId = storedValues.clientId || metadata.clientId || "demo-client";
      metadata.clientSecret = storedValues.clientSecret || metadata.clientSecret || "";
      metadata.scopes = storedValues.scopes || metadata.scopes || "openid profile email";
      metadata.redirectUri = storedValues.redirectUri || metadata.redirectUri || currentPageUrl();
      metadata.apiBaseUrl = storedValues.apiBaseUrl || metadata.apiBaseUrl || "https://api.example.com";
      metadata.postLogoutRedirectUri = storedValues.postLogoutRedirectUri || metadata.postLogoutRedirectUri || "https://app.example.com/post-logout";
      applyValues(metadata);
    } else {
      const previewValues = {
        discoveryUrl: storedValues.discoveryUrl || "https://auth.example.com/.well-known/openid-configuration",
        clientId: storedValues.clientId || "demo-client",
        scopes: storedValues.scopes || "openid profile email",
        redirectUri: storedValues.redirectUri || currentPageUrl(),
        apiBaseUrl: storedValues.apiBaseUrl || "https://api.example.com",
        postLogoutRedirectUri: storedValues.postLogoutRedirectUri || "https://app.example.com/post-logout",
        issuer: issuerFromDiscovery(storedValues.discoveryUrl || "https://auth.example.com/.well-known/openid-configuration"),
        oauthMetadataUrl: storedValues.discoveryUrl
          ? issuerFromDiscovery(storedValues.discoveryUrl) + "/.well-known/oauth-authorization-server"
          : "https://auth.example.com/.well-known/oauth-authorization-server",
        authorizationEndpoint: "$AUTHORIZATION_ENDPOINT",
        tokenEndpoint: "$TOKEN_ENDPOINT",
        userinfoEndpoint: "$USERINFO_ENDPOINT",
        introspectionEndpoint: "$INTROSPECTION_ENDPOINT",
        revocationEndpoint: "$REVOCATION_ENDPOINT",
        deviceAuthorizationEndpoint: "$DEVICE_AUTHORIZATION_ENDPOINT",
        parEndpoint: "$PAR_ENDPOINT",
        jwksUri: "$JWKS_URI",
        endSessionEndpoint: "$END_SESSION_ENDPOINT"
      };
      applyValues(previewValues);
    }

    if (importButton) {
      importButton.addEventListener("click", importDiscovery);
    }

    if (startLoginNoPkceButton) {
      startLoginNoPkceButton.addEventListener("click", function () {
        startLogin(false).catch(function (error) {
          setStatus(`Could not start the popup login flow. (${error.message})`, true);
        });
      });
    }

    if (startLoginButton) {
      startLoginButton.addEventListener("click", function () {
        startLogin(true).catch(function (error) {
          setStatus(`Could not start the popup login flow. (${error.message})`, true);
        });
      });
    }

    if (exchangeCodeNoSecretButton) {
      exchangeCodeNoSecretButton.addEventListener("click", function () {
        exchangeAuthorizationCode(false).catch(function (error) {
          setStatus(`Could not exchange the authorization code. (${error.message})`, true);
        });
      });
    }

    if (exchangeCodePkceNoSecretButton) {
      exchangeCodePkceNoSecretButton.addEventListener("click", function () {
        exchangeAuthorizationCode(true).catch(function (error) {
          setStatus(`Could not exchange the PKCE authorization code. (${error.message})`, true);
        });
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", resetValues);
    }

    window.addEventListener("message", handlePopupMessage);

    if (captureResult.codeCaptured) {
      setCapturedCodeDisplay(loadAuthCode());
      const latestMetadata = loadMetadata();
      if (latestMetadata) {
        latestMetadata.clientId = storedValues.clientId || latestMetadata.clientId || "demo-client";
        latestMetadata.clientSecret = storedValues.clientSecret || latestMetadata.clientSecret || "";
        latestMetadata.scopes = storedValues.scopes || latestMetadata.scopes || "openid profile email";
        latestMetadata.redirectUri = storedValues.redirectUri || latestMetadata.redirectUri || currentPageUrl();
        latestMetadata.apiBaseUrl = storedValues.apiBaseUrl || latestMetadata.apiBaseUrl || "https://api.example.com";
        latestMetadata.postLogoutRedirectUri = storedValues.postLogoutRedirectUri || latestMetadata.postLogoutRedirectUri || "https://app.example.com/post-logout";
        applyValues(latestMetadata);
      }
      setStatus("Authorization code captured from the redirect. The token exchange command below now uses it.", false);
    } else if (captureResult.error) {
      setStatus(`Authorization redirect returned an error: ${captureResult.error}`, true);
    } else if (loadAuthCode()) {
      setCapturedCodeDisplay(loadAuthCode());
      setStatus("A captured authorization code is already available in this browser session.", false);
    }
  });
})();
