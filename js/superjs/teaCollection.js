const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const table = document.getElementById("collectorTable");


document.querySelector(".close").onclick = () =>{
    modal.style.display = "none";
};

function updateCount(){
    collectorCount.textContent = table.rows.length;
}

function getSelectedRow(){

    const selected =
    document.querySelector('input[name="collector"]:checked');

    if(!selected){
        alert("Please select a collector");
        return null;
    }

    return selected.closest("tr");
}

document.getElementById("addBtn").onclick = () => {

    modal.style.display = "block";

    modalTitle.innerHTML = "Add New Collector";

    modalBody.innerHTML = `
        <input type="text" id="username" placeholder="Username">
        <input type="email" id="email" placeholder="Email">
        <input type="text" id="nic" placeholder="NIC Number">
        <input type="number" id="age" placeholder="Age">
        <input type="text" id="phone" placeholder="Phone Number">
        <input type="text" id="address" placeholder="Address">

        <button onclick="saveCollector()">Save Collector</button>
    `;
};



function saveCollector(){

    const username=document.getElementById("username").value;
    const email=document.getElementById("email").value;
    const nic=document.getElementById("nic").value;
    const age=document.getElementById("age").value;
    const phone=document.getElementById("phone").value;
    const address=document.getElementById("address").value;

    let row=table.insertRow();

    row.innerHTML=`
    <td><input type="radio" name="collector"></td>
    <td>${username}</td>
    <td>${email}</td>
    <td>${nic}</td>
    <td>${age}</td>
    <td>${phone}</td>
    <td>${address}</td>
   
    `;

    updateCount();
    modal.style.display="none";
}

document.getElementById("viewBtn").onclick = () => {

    let row=getSelectedRow();
    if(!row) return;

    modal.style.display="block";

    modalTitle.innerHTML="Collector Details";

    modalBody.innerHTML=`
        <p><b>Username:</b> ${row.cells[1].innerText}</p><br>
        <p><b>Email:</b> ${row.cells[2].innerText}</p><br>
        <p><b>NIC:</b> ${row.cells[3].innerText}</p><br>
        <p><b>Age:</b> ${row.cells[4].innerText}</p><br>
        <p><b>Phone:</b> ${row.cells[5].innerText}</p><br>
        <p><b>Address:</b> ${row.cells[6].innerText}</p><br>
        <p><b>Role:</b> ${row.cells[7].innerText}</p>
    `;
};

document.getElementById("editBtn").onclick = () => {

    let row=getSelectedRow();
    if(!row) return;

    modal.style.display="block";

    modalTitle.innerHTML="Edit Collector";

    modalBody.innerHTML=`
    <input id="eUsername" value="${row.cells[1].innerText}">
    <input id="eEmail" value="${row.cells[2].innerText}">
    <input id="eNic" value="${row.cells[3].innerText}">
    <input id="eAge" value="${row.cells[4].innerText}">
    <input id="ePhone" value="${row.cells[5].innerText}">
    <input id="eAddress" value="${row.cells[6].innerText}">

    <button onclick="updateCollector()">Update</button>
    `;

    window.selectedRow=row;
};

function updateCollector(){

    selectedRow.cells[1].innerText=
    document.getElementById("eUsername").value;

    selectedRow.cells[2].innerText=
    document.getElementById("eEmail").value;

    selectedRow.cells[3].innerText=
    document.getElementById("eNic").value;

    selectedRow.cells[4].innerText=
    document.getElementById("eAge").value;

    selectedRow.cells[5].innerText=
    document.getElementById("ePhone").value;

    selectedRow.cells[6].innerText=
    document.getElementById("eAddress").value;

    modal.style.display="none";
}

document.getElementById("deleteBtn").onclick = () => {

    let row=getSelectedRow();
    if(!row) return;

    modal.style.display="block";

    modalTitle.innerHTML="Remove Collector";

    modalBody.innerHTML=`
    <p>Are you sure you want to delete
    <b>${row.cells[1].innerText}</b>?</p><br>

    <button onclick="confirmDelete()">Delete</button>
    `;

    window.selectedRow=row;
};

function confirmDelete(){

    selectedRow.remove();

    updateCount();

    modal.style.display="none";
}

updateCount();

