async function requestAuth(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Request failed." }));
        throw new Error(errorData.message || "Request failed.");
    }

    return response.json();
}

function getUrlState() {
    const params = new URLSearchParams(window.location.search);
    return {
        mode: params.get("mode") || "login",
        role: params.get("role") || "Admin",
    };
}

function updateUrl(mode, role) {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("role", role);
    window.history.replaceState({}, "", `/auth?${params.toString()}`);
}

function setAuthMode(mode) {
    const title = document.getElementById("authTitle");
    const note = document.getElementById("authNote");
    const submitButton = document.getElementById("authSubmitButton");
    const fullNameField = document.getElementById("fullNameField");
    const contactField = document.getElementById("contactField");
    const specializationField = document.getElementById("specializationField");
    const confirmPasswordField = document.getElementById("confirmPasswordField");
    const roleSelect = document.getElementById("authRole");
    const loginModeButton = document.getElementById("loginModeButton");
    const registerModeButton = document.getElementById("registerModeButton");
    const effectiveMode = roleSelect.value === "Admin" && mode === "register" ? "login" : mode;

    if (!title) {
        return;
    }

    const selectedRole = roleSelect.value;
    const isRegisterMode = effectiveMode === "register";

    if (selectedRole === "Admin") {
        loginModeButton.style.display = "inline-block";
        registerModeButton.style.display = "none";
    } else {
        loginModeButton.style.display = "inline-block";
        registerModeButton.style.display = "inline-block";
    }

    title.textContent = `${selectedRole} ${isRegisterMode ? "Registration" : "Login"}`;
    note.textContent = isRegisterMode
        ? `Enter name, email, contact number, password, and confirm password to create a ${selectedRole.toLowerCase()} account.`
        : `Enter email and password to login as ${selectedRole.toLowerCase()}.`;
    submitButton.textContent = isRegisterMode ? "Register" : "Login";
    fullNameField.classList.toggle("hidden-field", !isRegisterMode);
    fullNameField.hidden = !isRegisterMode;
    fullNameField.querySelector("input").required = isRegisterMode;
    contactField.classList.toggle("hidden-field", !isRegisterMode);
    contactField.hidden = !isRegisterMode;
    contactField.querySelector("input").required = isRegisterMode;
    specializationField.classList.toggle("hidden-field", !(isRegisterMode && selectedRole === "Doctor"));
    specializationField.hidden = !(isRegisterMode && selectedRole === "Doctor");
    specializationField.querySelector("input").required = isRegisterMode && selectedRole === "Doctor";
    confirmPasswordField.classList.toggle("hidden-field", !isRegisterMode);
    confirmPasswordField.hidden = !isRegisterMode;
    confirmPasswordField.querySelector("input").required = isRegisterMode;
    loginModeButton.classList.toggle("active", !isRegisterMode);
    registerModeButton.classList.toggle("active", isRegisterMode);

    updateUrl(effectiveMode, selectedRole);
}

async function startAuthPage() {
    const bodyPage = document.body.dataset.page;

    if (bodyPage !== "auth") {
        return;
    }

    const urlState = getUrlState();
    const form = document.getElementById("authForm");
    const roleSelect = document.getElementById("authRole");
    const loginModeButton = document.getElementById("loginModeButton");
    const registerModeButton = document.getElementById("registerModeButton");
    const messageBox = document.getElementById("authMessage");
    let currentMode = urlState.mode;

    roleSelect.value = urlState.role;
    if (roleSelect.value === "Admin" && currentMode === "register") {
        currentMode = "login";
    }
    setAuthMode(currentMode);

    roleSelect.addEventListener("change", () => {
        if (roleSelect.value === "Admin" && currentMode === "register") {
            currentMode = "login";
        }
        setAuthMode(currentMode);
    });

    loginModeButton.addEventListener("click", () => {
        currentMode = "login";
        setAuthMode(currentMode);
    });

    registerModeButton.addEventListener("click", () => {
        if (roleSelect.value === "Admin") {
            return;
        }
        currentMode = "register";
        setAuthMode(currentMode);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const body = Object.fromEntries(formData.entries());
        const endpoint = currentMode === "register" ? "/api/auth/register" : "/api/auth/login";

        try {
            const result = await requestAuth(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            messageBox.textContent = result.message;
            messageBox.style.color = "#166534";
            window.location.href = result.redirectPath;
        } catch (error) {
            messageBox.textContent = error.message;
            messageBox.style.color = "#dc2626";
        }
    });
}

startAuthPage();
