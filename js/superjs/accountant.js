const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const table = document.getElementById("accountantTable");

document.querySelector(".close").onclick = () =>{
    modal.style.display = "none";
};

function getSelectedRow(){

    const selected =
    document.querySelector('input[name="accountant"]:checked');

    if(!selected){
        alert("Please select an accountant");
        return null;
    }

    return selected.closest("tr");
}

document.getElementById("addBtn").onclick = () => {

    modal.style.display = "block";

    modalTitle.innerHTML = "Add Accountant";

    modalBody.innerHTML = `
        <input type="text" id="username" placeholder="Username">
        <input type="email" id="email" placeholder="Email">
        <input type="text" id="nic" placeholder="NIC Number">
        <input type="number" id="age" placeholder="Age">
        <input type="text" id="phone" placeholder="Phone Number">
        <input type="text" id="address" placeholder="Address">

        <button onclick="saveAccountant()">Save</button>
    `;
};

function saveAccountant(){

    let row = table.insertRow();

    row.innerHTML = `
        <td><input type="radio" name="accountant"></td>
        <td>${document.getElementById("username").value}</td>
        <td>${document.getElementById("email").value}</td>
        <td>${document.getElementById("nic").value}</td>
        <td>${document.getElementById("age").value}</td>
        <td>${document.getElementById("phone").value}</td>
        <td>${document.getElementById("address").value}</td>
    `;

    modal.style.display = "none";
}

document.getElementById("viewBtn").onclick = () => {

    let row = getSelectedRow();
    if(!row) return;

    modal.style.display = "block";

    modalTitle.innerHTML = "Accountant Details";

    modalBody.innerHTML = `
        <p><b>Username:</b> ${row.cells[1].innerText}</p><br>
        <p><b>Email:</b> ${row.cells[2].innerText}</p><br>
        <p><b>NIC:</b> ${row.cells[3].innerText}</p><br>
        <p><b>Age:</b> ${row.cells[4].innerText}</p><br>
        <p><b>Phone:</b> ${row.cells[5].innerText}</p><br>
        <p><b>Address:</b> ${row.cells[6].innerText}</p>
    `;
};

document.getElementById("editBtn").onclick = () => {

    let row = getSelectedRow();
    if(!row) return;

    window.selectedRow = row;

    modal.style.display = "block";

    modalTitle.innerHTML = "Edit Accountant";

    modalBody.innerHTML = `
        <input id="eUsername" value="${row.cells[1].innerText}">
        <input id="eEmail" value="${row.cells[2].innerText}">
        <input id="eNic" value="${row.cells[3].innerText}">
        <input id="eAge" value="${row.cells[4].innerText}">
        <input id="ePhone" value="${row.cells[5].innerText}">
        <input id="eAddress" value="${row.cells[6].innerText}">

        <button onclick="updateAccountant()">Update</button>
    `;
};

function updateAccountant(){

    selectedRow.cells[1].innerText =
    document.getElementById("eUsername").value;

    selectedRow.cells[2].innerText =
    document.getElementById("eEmail").value;

    selectedRow.cells[3].innerText =
    document.getElementById("eNic").value;

    selectedRow.cells[4].innerText =
    document.getElementById("eAge").value;

    selectedRow.cells[5].innerText =
    document.getElementById("ePhone").value;

    selectedRow.cells[6].innerText =
    document.getElementById("eAddress").value;

    modal.style.display = "none";
}

document.getElementById("deleteBtn").onclick = () => {

    let row = getSelectedRow();
    if(!row) return;

    window.selectedRow = row;

    modal.style.display = "block";

    modalTitle.innerHTML = "Remove Accountant";

    modalBody.innerHTML = `
        <p>Are you sure you want to remove
        <b>${row.cells[1].innerText}</b> ?</p><br>

        <button onclick="confirmDelete()">Delete</button>
    `;
};

function confirmDelete(){

    selectedRow.remove();

    modal.style.display = "none";
}