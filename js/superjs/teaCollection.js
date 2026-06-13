const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const table = document.getElementById("collectorTable");

document.querySelector(".close").onclick = () => {
    modal.style.display = "none";
};

async function fetchCollectors() {
    try {
        const response = await fetch('/api/superintendent/users?role=collector');
        if (!response.ok) throw new Error('Failed to fetch collectors');
        const collectors = await response.json();
        renderCollectors(collectors);
    } catch (error) {
        console.error('Error fetching collectors:', error);
        table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:red;">Error loading collectors.</td></tr>';
    }
}

function renderCollectors(collectors) {
    table.innerHTML = '';
    collectors.forEach(c => {
        const row = document.createElement('tr');
        const statusBadge = c.account_status === 'Active' ? 
            `<span style="padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; background: #e6fffa; color: #006d77;">Active</span>` :
            `<span style="padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; background: #ffebee; color: #c62828;">Deactive</span>`;
        row.innerHTML = `
            <td><input type="radio" name="collector" value="${c.email}"></td>
            <td><b>${c.username}</b></td>
            <td>${c.email}</td>
            <td>${c.nic_number || '-'}</td>
            <td>${c.age || '-'}</td>
            <td>${c.phone_number || '-'}</td>
            <td>${c.address || '-'}</td>
            <td>${statusBadge}</td>
        `;
        table.appendChild(row);
    });
}

function getSelectedCollectorEmail() {
    const selected = document.querySelector('input[name="collector"]:checked');
    if (!selected) {
        alert("Please select a Collector first.");
        return null;
    }
    return selected.value;
}

document.getElementById("addBtn").onclick = () => {
    modal.style.display = "block";
    modalTitle.innerHTML = "Add New Collector";
    modalBody.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
            <input type="text" id="username" placeholder="Username" required>
            <input type="email" id="email" placeholder="Email" required>
            <input type="password" id="password" placeholder="Password (default: 123456)">
            <input type="text" id="nic" placeholder="NIC Number">
            <input type="number" id="age" placeholder="Age">
            <input type="text" id="phone" placeholder="Phone Number">
            <input type="text" id="address" placeholder="Address">
            <label style="font-weight:600; font-size:0.9rem; margin-top:5px; text-align:left;">Account Status</label>
            <select id="account_status" style="padding:10px; border-radius:8px; border:1px solid #ccc;">
                <option value="Active">Active</option>
                <option value="Deactive">Deactive</option>
            </select>
            <button onclick="saveCollector()" style="margin-top:10px; padding:10px; background:#2bb673; color:white; border:none; border-radius:8px; cursor:pointer;">Save Collector</button>
        </div>
    `;
};

async function saveCollector() {
    const data = {
        username: document.getElementById("username").value.trim(),
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value.trim() || '123456',
        nic_number: document.getElementById("nic").value.trim() || null,
        age: document.getElementById("age").value || null,
        phone_number: document.getElementById("phone").value.trim() || null,
        address: document.getElementById("address").value.trim() || null,
        role: 'collector',
        account_status: document.getElementById("account_status").value
    };

    if (!data.username || !data.email) {
        alert("Username and Email are required.");
        return;
    }

    try {
        const response = await fetch('/api/superintendent/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save collector');
        }

        alert("✅ Collector added successfully!");
        modal.style.display = "none";
        fetchCollectors();
    } catch (error) {
        console.error(error);
        alert("❌ Error: " + error.message);
    }
}

document.getElementById("viewBtn").onclick = async () => {
    const email = getSelectedCollectorEmail();
    if (!email) return;

    try {
        const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`);
        if (!response.ok) throw new Error('User not found');
        const user = await response.json();

        modal.style.display = "block";
        modalTitle.innerHTML = "Collector Details";
        modalBody.innerHTML = `
            <div style="text-align:left; line-height:1.6;">
                <p><b>Username:</b> ${user.username}</p>
                <p><b>Email:</b> ${user.email}</p>
                <p><b>Password:</b> <span style="font-family: monospace; font-weight: bold; background: #eee; padding: 2px 6px; border-radius: 4px;">${user.password || 'N/A'}</span></p>
                <p><b>Role:</b> ${user.role}</p>
                <p><b>Phone:</b> ${user.phone_number}</p>
                <p><b>Address:</b> ${user.address}</p>
            </div>
        `;
    } catch (error) {
        console.error(error);
        alert("Error loading collector details.");
    }
};

document.getElementById("editBtn").onclick = async () => {
    const email = getSelectedCollectorEmail();
    if (!email) return;

    try {
        const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`);
        if (!response.ok) throw new Error('User not found');
        const user = await response.json();

        // Fetch detailed record to populate NIC and Age
        const allUsersRes = await fetch(`/api/superintendent/users?role=collector`);
        const allUsers = await allUsersRes.json();
        const detailUser = allUsers.find(u => u.email === email) || {};

        modal.style.display = "block";
        modalTitle.innerHTML = "Edit Collector";
        modalBody.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:10px;">
                <p><b>Email:</b> ${email} (Read-only)</p>
                <label style="font-weight:600; font-size:0.9rem; text-align:left; margin-top:5px;">Username</label>
                <input type="text" id="eUsername" value="${user.username || ''}" placeholder="Username" required>
                <label style="font-weight:600; font-size:0.9rem; text-align:left; margin-top:5px;">Password</label>
                <input type="text" id="ePassword" value="${detailUser.password || ''}" placeholder="Password" required>
                <label style="font-weight:600; font-size:0.9rem; text-align:left; margin-top:5px;">NIC Number</label>
                <input type="text" id="eNic" value="${detailUser.nic_number || ''}" placeholder="NIC Number">
                <label style="font-weight:600; font-size:0.9rem; text-align:left; margin-top:5px;">Age</label>
                <input type="number" id="eAge" value="${detailUser.age || ''}" placeholder="Age">
                <label style="font-weight:600; font-size:0.9rem; text-align:left; margin-top:5px;">Phone Number</label>
                <input type="text" id="ePhone" value="${user.phone_number === 'Not provided' ? '' : user.phone_number}" placeholder="Phone Number">
                <label style="font-weight:600; font-size:0.9rem; text-align:left; margin-top:5px;">Address</label>
                <input type="text" id="eAddress" value="${user.address === 'No address on file' ? '' : user.address}" placeholder="Address">
                <label style="font-weight:600; font-size:0.9rem; margin-top:5px; text-align:left;">Account Status</label>
                <select id="eaccount_status" style="padding:10px; border-radius:8px; border:1px solid #ccc;">
                    <option value="Active" ${detailUser.account_status === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="Deactive" ${detailUser.account_status === 'Deactive' ? 'selected' : ''}>Deactive</option>
                </select>
                <button onclick="updateCollector('${email}')" style="margin-top:10px; padding:10px; background:#1769c5; color:white; border:none; border-radius:8px; cursor:pointer;">Update Collector</button>
            </div>
        `;
    } catch (error) {
        console.error(error);
        alert("Error loading collector for edit.");
    }
};

async function updateCollector(email) {
    const data = {
        username: document.getElementById("eUsername").value.trim(),
        password: document.getElementById("ePassword").value.trim() || null,
        nic_number: document.getElementById("eNic").value.trim() || null,
        age: document.getElementById("eAge").value || null,
        phone_number: document.getElementById("ePhone").value.trim() || null,
        address: document.getElementById("eAddress").value.trim() || null,
        role: 'collector',
        account_status: document.getElementById("eaccount_status").value
    };

    if (!data.username) {
        alert("Username is required.");
        return;
    }

    try {
        const response = await fetch(`/api/superintendent/users/${encodeURIComponent(email)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to update collector');
        }

        alert("✅ Collector updated successfully!");
        modal.style.display = "none";
        fetchCollectors();
    } catch (error) {
        console.error(error);
        alert("❌ Error: " + error.message);
    }
}

document.getElementById("deleteBtn").onclick = () => {
    const email = getSelectedCollectorEmail();
    if (!email) return;

    modal.style.display = "block";
    modalTitle.innerHTML = "Remove Collector";
    modalBody.innerHTML = `
        <p>Are you sure you want to delete collector <b>${email}</b>?</p><br>
        <button onclick="confirmDelete('${email}')" style="padding:10px 20px; background:red; color:white; border:none; border-radius:8px; cursor:pointer;">Delete</button>
    `;
};

async function confirmDelete(email) {
    try {
        const response = await fetch(`/api/superintendent/users/${encodeURIComponent(email)}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to delete collector');
        }

        alert("✅ Collector removed successfully!");
        modal.style.display = "none";
        fetchCollectors();
    } catch (error) {
        console.error(error);
        alert("❌ Error: " + error.message);
    }
}

fetchCollectors();
