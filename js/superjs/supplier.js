const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const table = document.getElementById("SupplierTable");

document.querySelector(".close").onclick = () => {
    modal.style.display = "none";
};

let selectedSupplierId = null;

async function fetchSuppliers() {
    try {
        const response = await fetch('/api/superintendent/suppliers');
        if (!response.ok) throw new Error('Failed to fetch suppliers');
        const suppliers = await response.json();
        renderSuppliers(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:red;">Error loading suppliers.</td></tr>';
    }
}

function renderSuppliers(suppliers) {
    table.innerHTML = '';
    suppliers.forEach(sup => {
        const row = document.createElement('tr');
        const statusBadge = sup.account_status === 'Active' ? 
            `<span style="padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; background: #e6fffa; color: #006d77;">Active</span>` :
            `<span style="padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; background: #ffebee; color: #c62828;">Deactive</span>`;
        row.innerHTML = `
            <td><input type="radio" name="Supplier" value="${sup.sup_id}"></td>
            <td>${sup.sup_id}</td>
            <td><b>${sup.name}</b></td>
            <td>${sup.supplier_field || '-'}</td>
            <td>${sup.bank_account_number || '-'}</td>
            <td>${sup.phone_number || '-'}</td>
            <td>${statusBadge}</td>
        `;
        table.appendChild(row);
    });
}

function getSelectedSupplierId() {
    const selected = document.querySelector('input[name="Supplier"]:checked');
    if (!selected) {
        alert("Please select a Supplier first.");
        return null;
    }
    return selected.value;
}

document.getElementById("addBtn").onclick = () => {
    modal.style.display = "block";
    modalTitle.innerHTML = "Add New Supplier";
    modalBody.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
            <input type="text" id="sup_id" placeholder="Supplier ID (e.g. SUP-0041)" required>
            <input type="text" id="name" placeholder="Supplier Name" required>
            <input type="number" id="age" placeholder="Age">
            <input type="text" id="address_line1" placeholder="Address Line 1">
            <input type="text" id="address_line2" placeholder="Address Line 2">
            <input type="text" id="phone_number" placeholder="Phone Number">
            <input type="text" id="nic_number" placeholder="NIC Number">
            <input type="text" id="supplier_field" placeholder="Field No (e.g. FLD-09)">
            <input type="text" id="bank_name" placeholder="Bank Name">
            <input type="text" id="bank_account_number" placeholder="Bank Account Number">
            <input type="text" id="branch_location" placeholder="Bank Branch">
            <label style="font-weight:600; font-size:0.9rem; margin-top:5px; text-align:left;">Account Status</label>
            <select id="account_status" style="padding:10px; border-radius:8px; border:1px solid #ccc;">
                <option value="Active">Active</option>
                <option value="Deactive">Deactive</option>
            </select>
            <button onclick="saveSupplier()" style="margin-top:10px; padding:10px; background:#2bb673; color:white; border:none; border-radius:8px; cursor:pointer;">Save Supplier</button>
        </div>
    `;
};

async function saveSupplier() {
    const data = {
        sup_id: document.getElementById("sup_id").value.trim(),
        name: document.getElementById("name").value.trim(),
        age: document.getElementById("age").value || null,
        address_line1: document.getElementById("address_line1").value.trim() || null,
        address_line2: document.getElementById("address_line2").value.trim() || null,
        phone_number: document.getElementById("phone_number").value.trim() || null,
        nic_number: document.getElementById("nic_number").value.trim() || null,
        supplier_field: document.getElementById("supplier_field").value.trim() || null,
        bank_name: document.getElementById("bank_name").value.trim() || null,
        bank_account_number: document.getElementById("bank_account_number").value.trim() || null,
        branch_location: document.getElementById("branch_location").value.trim() || null,
        account_status: document.getElementById("account_status").value
    };

    if (!data.sup_id || !data.name) {
        alert("Supplier ID and Name are required.");
        return;
    }

    try {
        const response = await fetch('/api/superintendent/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save supplier');
        }

        alert("✅ Supplier added successfully!");
        modal.style.display = "none";
        fetchSuppliers();
    } catch (error) {
        console.error(error);
        alert("❌ Error: " + error.message);
    }
}

document.getElementById("viewBtn").onclick = async () => {
    const id = getSelectedSupplierId();
    if (!id) return;

    try {
        const response = await fetch(`/api/supplier/${id}`);
        if (!response.ok) throw new Error('Supplier not found');
        const sup = await response.json();

        modal.style.display = "block";
        modalTitle.innerHTML = "Supplier Details";
        modalBody.innerHTML = `
            <div style="text-align:left; line-height:1.6;">
                <p><b>Supplier ID:</b> ${sup.sup_id}</p>
                <p><b>Name:</b> ${sup.name}</p>
                <p><b>Age:</b> ${sup.age || 'N/A'}</p>
                <p><b>NIC:</b> ${sup.nic_number || 'N/A'}</p>
                <p><b>Phone:</b> ${sup.phone_number || 'N/A'}</p>
                <p><b>Address 1:</b> ${sup.address_line1 || 'N/A'}</p>
                <p><b>Address 2:</b> ${sup.address_line2 || 'N/A'}</p>
                <p><b>Field No:</b> ${sup.supplier_field || 'N/A'}</p>
                <p><b>Bank Name:</b> ${sup.bank_name || 'N/A'}</p>
                <p><b>Account No:</b> ${sup.bank_account_number || 'N/A'}</p>
                <p><b>Branch:</b> ${sup.branch_location || 'N/A'}</p>
                <p><b>Status:</b> <span style="color:${sup.account_status === 'Active' ? 'green' : 'red'};font-weight:bold;">${sup.account_status}</span></p>
            </div>
        `;
    } catch (error) {
        console.error(error);
        alert("Error loading supplier details.");
    }
};

document.getElementById("editBtn").onclick = async () => {
    const id = getSelectedSupplierId();
    if (!id) return;

    try {
        const response = await fetch(`/api/supplier/${id}`);
        if (!response.ok) throw new Error('Supplier not found');
        const sup = await response.json();

        modal.style.display = "block";
        modalTitle.innerHTML = "Edit Supplier";
        modalBody.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:10px;">
                <p><b>Supplier ID:</b> ${sup.sup_id} (Read-only)</p>
                <input type="text" id="ename" value="${sup.name || ''}" placeholder="Supplier Name" required>
                <input type="number" id="eage" value="${sup.age || ''}" placeholder="Age">
                <input type="text" id="eaddress_line1" value="${sup.address_line1 || ''}" placeholder="Address Line 1">
                <input type="text" id="eaddress_line2" value="${sup.address_line2 || ''}" placeholder="Address Line 2">
                <input type="text" id="ephone_number" value="${sup.phone_number || ''}" placeholder="Phone Number">
                <input type="text" id="enic_number" value="${sup.nic_number || ''}" placeholder="NIC Number">
                <input type="text" id="esupplier_field" value="${sup.supplier_field || ''}" placeholder="Field No">
                <input type="text" id="ebank_name" value="${sup.bank_name || ''}" placeholder="Bank Name">
                <input type="text" id="ebank_account_number" value="${sup.bank_account_number || ''}" placeholder="Bank Account Number">
                <input type="text" id="ebranch_location" value="${sup.branch_location || ''}" placeholder="Bank Branch">
                <select id="eaccount_status">
                    <option value="Active" ${sup.account_status === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="Deactive" ${sup.account_status === 'Deactive' ? 'selected' : ''}>Deactive</option>
                </select>
                <button onclick="updateSupplier('${sup.sup_id}')" style="margin-top:10px; padding:10px; background:#1769c5; color:white; border:none; border-radius:8px; cursor:pointer;">Update Supplier</button>
            </div>
        `;
    } catch (error) {
        console.error(error);
        alert("Error loading supplier details for edit.");
    }
};

async function updateSupplier(id) {
    const data = {
        name: document.getElementById("ename").value.trim(),
        age: document.getElementById("eage").value || null,
        address_line1: document.getElementById("eaddress_line1").value.trim() || null,
        address_line2: document.getElementById("eaddress_line2").value.trim() || null,
        phone_number: document.getElementById("ephone_number").value.trim() || null,
        nic_number: document.getElementById("enic_number").value.trim() || null,
        supplier_field: document.getElementById("esupplier_field").value.trim() || null,
        bank_name: document.getElementById("ebank_name").value.trim() || null,
        bank_account_number: document.getElementById("ebank_account_number").value.trim() || null,
        branch_location: document.getElementById("ebranch_location").value.trim() || null,
        account_status: document.getElementById("eaccount_status").value
    };

    if (!data.name) {
        alert("Name is required.");
        return;
    }

    try {
        const response = await fetch(`/api/superintendent/suppliers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to update supplier');
        }

        alert("✅ Supplier updated successfully!");
        modal.style.display = "none";
        fetchSuppliers();
    } catch (error) {
        console.error(error);
        alert("❌ Error: " + error.message);
    }
}

document.getElementById("deleteBtn").onclick = () => {
    const id = getSelectedSupplierId();
    if (!id) return;

    modal.style.display = "block";
    modalTitle.innerHTML = "Remove Supplier";
    modalBody.innerHTML = `
        <p>Are you sure you want to delete supplier <b>${id}</b>?</p><br>
        <button onclick="confirmDelete('${id}')" style="padding:10px 20px; background:red; color:white; border:none; border-radius:8px; cursor:pointer;">Delete</button>
    `;
};

async function confirmDelete(id) {
    try {
        const response = await fetch(`/api/superintendent/suppliers/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to delete supplier');
        }

        alert("✅ Supplier removed successfully!");
        modal.style.display = "none";
        fetchSuppliers();
    } catch (error) {
        console.error(error);
        alert("❌ Error: " + error.message);
    }
}

fetchSuppliers();
