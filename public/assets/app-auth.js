(function () {
  const loginPath = "/login.php";

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

  let session = requestSession();
  if (session.setupRequired || !session.authenticated) {
    redirectToLogin();
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
    const options = {
      method,
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    };
    if (method !== "GET") {
      options.headers["Content-Type"] = "application/json";
      options.headers["X-CSRF-Token"] = csrf();
      options.body = JSON.stringify(payload || {});
    }

    const response = await fetch(`/api.php?action=${encodeURIComponent(action)}`, options);
    const data = await response.json().catch(() => ({}));
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
