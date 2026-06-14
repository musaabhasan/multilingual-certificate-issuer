(function () {
  const loginPath = "/login.php";
  const mfaPath = "/mfa.php";

  function requestSession() {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/api.php?action=session", false);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.send();
    if (xhr.status < 200 || xhr.status >= 300) {
      throw new Error("Session check failed.");
    }
    return JSON.parse(xhr.responseText || "{}");
  }

  function redirectToLogin() {
    const next = window.location.pathname + window.location.search;
    window.location.replace(`${loginPath}?next=${encodeURIComponent(next)}`);
  }

  function redirectToMfa() {
    const next = window.location.pathname + window.location.search;
    window.location.replace(`${mfaPath}?next=${encodeURIComponent(next)}`);
  }

  let session = requestSession();
  if (session.setupRequired || !session.authenticated) {
    redirectToLogin();
    return;
  }
  if (session.mfaRequired) {
    redirectToMfa();
    return;
  }

  function csrf() {
    return session.csrf || "";
  }

  function refreshSession() {
    session = requestSession();
    return session;
  }

  function syncApi(method, action, payload) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `/api.php?action=${encodeURIComponent(action)}`, false);
    xhr.setRequestHeader("Accept", "application/json");
    if (method !== "GET") {
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("X-CSRF-Token", csrf());
    }
    xhr.send(method === "GET" ? null : JSON.stringify(payload || {}));

    const response = JSON.parse(xhr.responseText || "{}");
    if (xhr.status === 428 || response.mfaRequired) {
      redirectToMfa();
      throw new Error(response.error || "Administrator MFA is required.");
    }
    if (xhr.status === 401 || xhr.status === 419) {
      redirectToLogin();
      throw new Error(response.error || "Session expired.");
    }
    if (xhr.status < 200 || xhr.status >= 300) {
      throw new Error(response.error || "Request failed.");
    }
    if (response.csrf) {
      session.csrf = response.csrf;
    }
    return response;
  }

  async function api(method, action, payload) {
    const controller = new AbortController();
    const timeoutMs = ["send-one", "dispatch-due", "settings-test-email", "settings-smtp-diagnostics"].includes(action) ? 60000 : 15000;
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    const options = {
      method,
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      signal: controller.signal
    };
    if (method !== "GET") {
      options.headers["Content-Type"] = "application/json";
      options.headers["X-CSRF-Token"] = csrf();
      options.body = JSON.stringify(payload || {});
    }

    let response;
    try {
      response = await fetch(`/api.php?action=${encodeURIComponent(action)}`, options);
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out. If a delivery request is still running, wait a moment and refresh the queue.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));
    if (response.status === 428 || data.mfaRequired) {
      redirectToMfa();
      throw new Error(data.error || "Administrator MFA is required.");
    }
    if (response.status === 401 || response.status === 419) {
      redirectToLogin();
      throw new Error(data.error || "Session expired.");
    }
    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }
    if (data.csrf) {
      session.csrf = data.csrf;
    }
    return data;
  }

  window.CertificateIssuerAuth = {
    get user() {
      return session.user;
    },
    get csrfToken() {
      return csrf();
    },
    refreshSession,
    syncApi,
    api
  };

  document.querySelectorAll("[data-current-user]").forEach((element) => {
    element.textContent = session.user?.name || session.user?.email || "Signed in";
  });
})();
