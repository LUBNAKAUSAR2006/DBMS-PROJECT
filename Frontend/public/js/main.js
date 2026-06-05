async function requestData(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Request failed." }));
        throw new Error(errorData.message || "Request failed.");
    }

    return response.json();
}

async function getCurrentUser() {
    const data = await requestData("/api/auth/me");
    return data.user;
}

async function logoutUser() {
    await requestData("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });

    window.location.href = "/";
}

async function setupProtectedPage() {
    const user = await getCurrentUser();
    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser);
    }

    document.querySelectorAll("[data-roles]").forEach((element) => {
        const roles = element.dataset.roles.split(",").map((item) => item.trim());

        if (!roles.includes(user.role)) {
            element.style.display = "none";
        }
    });

    return user;
}

function createOption(value, text) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    return option;
}

function fillSelect(select, items, getLabel, includeAllOption = false) {
    if (!select) {
        return;
    }

    select.innerHTML = "";

    if (includeAllOption) {
        select.appendChild(createOption("", "All Doctors"));
    } else {
        select.appendChild(createOption("", "Select"));
    }

    items.forEach((item) => {
        select.appendChild(createOption(item._id, getLabel(item)));
    });
}

function fillMultiSelect(select, items, getLabel) {
    if (!select) {
        return;
    }

    select.innerHTML = "";
    items.forEach((item) => {
        select.appendChild(createOption(item._id, getLabel(item)));
    });
}

function showMessage(container, message, isError = false) {
    container.textContent = message;
    container.style.color = isError ? "#dc2626" : "#166534";
}

function drawBars(container, items, emptyMessage) {
    if (!container) {
        return;
    }

    if (!items.length) {
        container.innerHTML = `<p>${emptyMessage}</p>`;
        return;
    }

    const highestValue = Math.max(...items.map((item) => item.total));
    container.innerHTML = items
        .map((item) => {
            const width = highestValue ? Math.round((item.total / highestValue) * 100) : 0;
            return `
                <div>
                    <strong>${item._id}</strong>
                    <div class="chart-bar">
                        <span style="width: ${width}%">${item.total}</span>
                    </div>
                </div>
            `;
        })
        .join("");
}

async function loadCamps(selectId) {
    const camps = await requestData("/api/camps");
    const select = document.getElementById(selectId);
    fillSelect(select, camps, (camp) => `${camp.campName} - ${camp.campDate}`);
    return camps;
}

async function loadDoctors(selectId, campId = "", includeAllOption = false) {
    const url = campId ? `/api/doctors?campId=${campId}` : "/api/doctors";
    const doctors = await requestData(url);
    const select = document.getElementById(selectId);
    fillSelect(select, doctors, (doctor) => doctor.doctorName, includeAllOption);
    return doctors;
}

async function loadHomePage() {
    const user = await setupProtectedPage();
    document.getElementById("currentUserName").textContent = user.fullName;
    document.getElementById("currentUserRole").textContent = user.role;
}

async function loadAdminPage() {
    await setupProtectedPage();
    const camps = await requestData("/api/camps");
    const doctors = await requestData("/api/doctors");
    const campList = document.getElementById("campList");
    const doctorList = document.getElementById("doctorList");
    const doctorPicker = document.getElementById("campDoctorPicker");
    const addDoctorButton = document.getElementById("addDoctorButton");
    const selectedDoctorsList = document.getElementById("selectedDoctorsList");
    const campForm = document.getElementById("campForm");
    const submitButton = campForm.querySelector('button[type="submit"]');
    const selectedDoctorIds = new Set();
    let editingCampId = null;

    fillSelect(doctorPicker, doctors, (doctor) => `${doctor.doctorName} - ${doctor.specialization}`);

    function renderSelectedDoctors() {
        if (selectedDoctorIds.size === 0) {
            selectedDoctorsList.innerHTML = '<span class="empty-state">No doctors selected yet.</span>';
            return;
        }
        selectedDoctorsList.innerHTML = Array.from(selectedDoctorIds).map((id) => {
            const doctor = doctors.find((item) => item._id === id);
            const label = doctor ? `${doctor.doctorName} - ${doctor.specialization}` : id;
            return `<span class="doctor-chip">${label}<button type="button" data-id="${id}" class="remove-doctor-chip">x</button></span>`;
        }).join("");
        selectedDoctorsList.querySelectorAll(".remove-doctor-chip").forEach((button) => {
            button.addEventListener("click", () => {
                selectedDoctorIds.delete(button.dataset.id);
                renderSelectedDoctors();
            });
        });
    }

    function resetCampForm() {
        editingCampId = null;
        campForm.reset();
        selectedDoctorIds.clear();
        renderSelectedDoctors();
        submitButton.textContent = "Save Camp";
    }

    function startEditCamp(camp) {
        editingCampId = camp._id;
        campForm.campName.value = camp.campName;
        campForm.campDate.value = String(camp.campDate).slice(0, 10);
        campForm.location.value = camp.location;
        campForm.purpose.value = camp.purpose;
        selectedDoctorIds.clear();
        (camp.assignedDoctors || []).forEach((doctor) => selectedDoctorIds.add(doctor._id || doctor));
        renderSelectedDoctors();
        submitButton.textContent = "Update Camp";
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    addDoctorButton.addEventListener("click", () => {
        const value = doctorPicker.value;
        if (!value) {
            return;
        }
        selectedDoctorIds.add(value);
        renderSelectedDoctors();
    });

    campList.innerHTML = camps.length
        ? camps.map((camp) => `<div class="list-item"><strong>${camp.campName}</strong><p>${camp.location} | ${String(camp.campDate).slice(0, 10)}</p><p>Doctors: ${camp.assignedDoctors.length ? camp.assignedDoctors.map((doctor) => doctor.doctorName).join(", ") : "No doctors assigned"}</p><div class="camp-actions"><button type="button" class="edit-camp-button" data-id="${camp._id}">Edit</button><button type="button" class="remove-camp-button" data-id="${camp._id}">Remove Camp</button></div></div>`).join("")
        : '<p class="empty-state">No camps added yet.</p>';

    doctorList.innerHTML = doctors.length
        ? doctors.map((doctor) => `<div class="list-item"><strong>${doctor.doctorName}</strong><p>${doctor.specialization}</p><p>${doctor.doctorEmail} | ${doctor.doctorPhone}</p></div>`).join("")
        : '<p class="empty-state">No doctors added yet.</p>';

    campForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(campForm);
        const body = Object.fromEntries(formData.entries());
        body.assignedDoctors = Array.from(selectedDoctorIds);

        if (body.assignedDoctors.length === 0) {
            alert("Please select at least one doctor before saving the camp.");
            return;
        }

        try {
            if (editingCampId) {
                await requestData(`/api/camps/${editingCampId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            } else {
                await requestData("/api/camps", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            }
            window.location.reload();
        } catch (error) {
            alert(error.message);
        }
    });

    document.querySelectorAll(".remove-camp-button").forEach((button) => {
        button.addEventListener("click", async () => {
            if (!confirm("Remove this camp?")) {
                return;
            }
            try {
                await requestData(`/api/camps/${button.dataset.id}`, { method: "DELETE" });
                window.location.reload();
            } catch (error) {
                alert(error.message);
            }
        });
    });

    document.querySelectorAll(".edit-camp-button").forEach((button) => {
        button.addEventListener("click", () => {
            const camp = camps.find((item) => item._id === button.dataset.id);
            if (camp) {
                startEditCamp(camp);
            }
        });
    });
}

async function loadRegisterPage() {
    const user = await setupProtectedPage();
    document.getElementById("patientAccountName").value = user.fullName;
    document.getElementById("patientAccountEmail").value = user.email;
    document.getElementById("patientAccountContact").value = user.contactNumber;
    await loadCamps("patientCamp");
    await loadDoctors("patientDoctor");

    document.getElementById("patientCamp").addEventListener("change", async (event) => {
        await loadDoctors("patientDoctor", event.target.value);
    });

    document.getElementById("registrationForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const body = Object.fromEntries(formData.entries());
        const resultBox = document.getElementById("registrationResult");

        try {
            const result = await requestData("/api/patients/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            resultBox.innerHTML = `
                <div class="result-item">
                    <p><strong>Patient ID:</strong> ${result.patient.patientId}</p>
                    <p><strong>Patient Name:</strong> ${result.patient.fullName}</p>
                    <p><strong>Token Number:</strong> ${result.consultation.tokenNumber}</p>
                    <p><strong>Status:</strong> ${result.consultation.status}</p>
                    <p><strong>Next Step:</strong> Open My Reports after doctor consultation is completed.</p>
                </div>
            `;
            event.target.reset();
            document.getElementById("patientAccountName").value = user.fullName;
            document.getElementById("patientAccountEmail").value = user.email;
            document.getElementById("patientAccountContact").value = user.contactNumber;
        } catch (error) {
            showMessage(resultBox, error.message, true);
        }
    });
}

function createConsultationCard(item) {
    return `
        <tr>
            <td>${item.patient.patientId}</td>
            <td>${item.patient.fullName}</td>
            <td>${item.camp.campName}</td>
            <td>${item.symptoms || "Not added yet"}</td>
            <td>${item.previousConsultationDetails || item.previousReports || "No previous details"}</td>
            <td>
                ${item.status === "Consulted" ? "Consulted" : `
                    <form class="consultation-form" data-id="${item._id}">
                        <label>Symptoms<textarea name="symptoms" rows="2">${item.symptoms || ""}</textarea></label>
                        <label>Previous Reports<textarea name="previousReports" rows="2">${item.previousReports || ""}</textarea></label>
                        <label>Previous Consultation<textarea name="previousConsultationDetails" rows="2">${item.previousConsultationDetails || ""}</textarea></label>
                        <label>Diagnosis<input type="text" name="diagnosis" required></label>
                        <label>Medicines<textarea name="medicines" rows="2" required></textarea></label>
                        <button type="submit">Mark Consulted</button>
                    </form>
                `}
            </td>
            <td>${item.status}</td>
        </tr>
    `;
}

async function renderPendingConsultations() {
    const url = "/api/consultations/mine";
    const items = await requestData(url);
    const container = document.getElementById("pendingConsultations");

    container.innerHTML = items.length ? items.map(createConsultationCard).join("") : '<tr><td colspan="7" class="empty-state">No consultations found.</td></tr>';
    if (!items.length) {
        container.innerHTML = '<tr><td colspan="7" class="empty-state">No consultations found.</td></tr>';
    }

    document.querySelectorAll(".consultation-form").forEach((form) => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const consultationId = form.dataset.id;
            const body = Object.fromEntries(new FormData(form).entries());

            await requestData(`/api/consultations/${consultationId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            await renderPendingConsultations();
        });
    });
}

async function loadConsultationPage() {
    await setupProtectedPage();
    await renderPendingConsultations();
}

function buildQueryString(form) {
    const formData = new FormData(form);
    const params = new URLSearchParams();

    formData.forEach((value, key) => {
        if (value) {
            params.append(key, value);
        }
    });

    return params.toString();
}

async function loadReportsPage() {
    const user = await setupProtectedPage();
    const summary = await requestData("/api/reports/summary");
    document.getElementById("reportTotalPatients").textContent = summary.totalPatients;
    document.getElementById("reportTotalRegistrations").textContent = summary.totalRegistrations;

    if (user.role === "Patient") {
        document.getElementById("reportPageDescription").textContent = "View your own registrations, diagnosis records, and download your personal report.";
        document.getElementById("reportSummaryTitle").textContent = "My Report Summary";
        document.getElementById("reportSummaryNote").textContent = "This section shows only your own medical and registration data.";
        document.getElementById("reportFilterNote").textContent = "Filter only your own registrations by date or disease and download your report.";
        document.getElementById("reportTableTitle").textContent = "My Medical Records";
        document.getElementById("reportDoctorFilterWrapper").style.display = "none";
        document.getElementById("reportTableWrapper").hidden = true;
        document.getElementById("patientReportCards").hidden = false;
    } else {
        await loadDoctors("reportDoctorFilter", "", true);
    }

    drawBars(document.getElementById("genderChart"), summary.genderCount, "No gender data available.");
    drawBars(document.getElementById("ageChart"), summary.ageGroups, "No age data available.");
    drawBars(document.getElementById("diseaseChart"), summary.diseaseTrends, "No diagnosis data available.");
    await loadReportTable(null, user.role);

    document.getElementById("reportFilterForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        await loadReportTable(event.target, user.role);
    });

    document.getElementById("csvExportButton").addEventListener("click", () => {
        const form = document.getElementById("reportFilterForm");
        const query = buildQueryString(form);
        window.open(`/api/reports/export/csv?${query}`, "_blank");
    });

    document.getElementById("pdfExportButton").addEventListener("click", () => {
        window.open("/api/reports/export/pdf", "_blank");
    });
}

function renderPatientReportCards(items) {
    const container = document.getElementById("patientReportCards");

    if (!items.length) {
        container.innerHTML = '<p class="empty-state">No records found.</p>';
        return;
    }

    container.innerHTML = items.map((item) => `
        <div class="patient-report-card">
            <div class="patient-report-header">
                <strong>${item.camp.campName}</strong>
                <span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span>
            </div>
            <div class="patient-report-grid">
                <div><span>Patient ID</span><strong>${item.patient.patientId}</strong></div>
                <div><span>Patient Name</span><strong>${item.patient.fullName}</strong></div>
                <div><span>Age</span><strong>${item.patient.age || "-"}</strong></div>
                <div><span>Gender</span><strong>${item.patient.gender || "-"}</strong></div>
                <div><span>Contact</span><strong>${item.patient.phone || "-"}</strong></div>
                <div><span>City</span><strong>${item.patient.city || "-"}</strong></div>
                <div><span>Camp Date</span><strong>${item.camp.campDate ? String(item.camp.campDate).slice(0, 10) : "-"}</strong></div>
                <div><span>Camp Location</span><strong>${item.camp.location || "-"}</strong></div>
                <div><span>Doctor Consulted</span><strong>${item.doctor.doctorName} (${item.doctor.specialization || "-"})</strong></div>
                <div><span>Token Number</span><strong>${item.tokenNumber}</strong></div>
                <div><span>Registered On</span><strong>${new Date(item.registrationTime).toLocaleString()}</strong></div>
            </div>
            <div class="patient-report-section">
                <span>Symptoms</span>
                <p>${item.symptoms || "Not provided"}</p>
            </div>
            <div class="patient-report-section">
                <span>Previous Reports / Details</span>
                <p>${item.previousConsultationDetails || item.previousReports || "None"}</p>
            </div>
            <div class="patient-report-section">
                <span>Diagnosis</span>
                <p>${item.diagnosis || "Pending - awaiting doctor consultation"}</p>
            </div>
            <div class="patient-report-section">
                <span>Prescribed Medicines</span>
                <p>${item.medicines || "Pending - awaiting doctor consultation"}</p>
            </div>
        </div>
    `).join("");
}

async function loadReportTable(form = null, role = "Admin") {
    const query = form ? buildQueryString(form) : "";
    const url = query ? `/api/reports/registrations?${query}` : "/api/reports/registrations";
    const items = await requestData(url);

    if (role === "Patient") {
        renderPatientReportCards(items);
        return;
    }

    const tableBody = document.getElementById("reportTableBody");

    tableBody.innerHTML = items.length
        ? items
              .map(
                  (item) => `
                    <tr>
                        <td>${item.patient.patientId}</td>
                        <td>${item.patient.fullName}</td>
                        <td>${item.doctor.doctorName}</td>
                        <td>${item.camp.campName}</td>
                        <td>${item.symptoms || "-"}</td>
                        <td>${item.diagnosis || "Pending"}</td>
                        <td>${item.status}</td>
                        <td>${new Date(item.registrationTime).toLocaleDateString()}</td>
                    </tr>
                `
              )
              .join("")
        : '<tr><td colspan="8" class="empty-state">No records found.</td></tr>';
}

async function startPage() {
    const page = document.body.dataset.page;

    try {
        if (page === "home") {
            await loadHomePage();
        }

        if (page === "admin") {
            await loadAdminPage();
        }

        if (page === "register") {
            await loadRegisterPage();
        }

        if (page === "consultation") {
            await loadConsultationPage();
        }

        if (page === "reports") {
            await loadReportsPage();
        }
    } catch (error) {
        const mainArea = document.querySelector("main");

        if (mainArea) {
            mainArea.insertAdjacentHTML("afterbegin", `<div class="card"><p style="color:#dc2626;">${error.message}</p></div>`);
        }
    }
}

startPage();
