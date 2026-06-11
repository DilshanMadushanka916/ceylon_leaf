const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const table = document.getElementById("SupplierTable");


document.querySelector(".close").onclick = () =>{
    modal.style.display = "none";
};

function updateCount(){
    collectorCount.textContent = table.rows.length;
}

function getSelectedRow(){

    const selected =
    document.querySelector('input[name="Supplier"]:checked');

    if(!selected){
        alert("Please select a Supplier ");
        return null;
    }

    return selected.closest("tr");
}

document.getElementById("addBtn").onclick = () => {

    modal.style.display = "block";

    modalTitle.innerHTML = "Add New Supplier";

    modalBody.innerHTML = `
        <input type="text" id="supplie Id" placeholder="supplierId">
        <input type="text" id="supplier name" placeholder="supplier name">
        <input type="text" id="supplierField" placeholder="supplier Field">
        <input type="number" id="supplier account" placeholder="supplier account">
        <input type="number" id="phone" placeholder="Phone Number">
       

        <button onclick="saveSupplier()">Save Supplier</button>
    `;
};



function saveSupplier(){

    const supplierId=document.getElementById("supplieId").value;
    const supplierName=document.getElementById("supplierName").value;
    const FieldNo=document.getElementById("FieldNo").value;
    const supplierAccount=document.getElementById("supplierAccount").value;
    const phone=document.getElementById("phone").value;
    

    let row=table.insertRow();

    row.innerHTML=`
    <td><input type="radio" name="supplier"></td>
    <td>${supplierId}</td>
    <td>${supplierName}</td>
    <td>${FieldNo}</td>
    <td>${supplierAccount}</td>
    <td>${phone}</td>
   
   
    `;

    updateCount();
    modal.style.display="none";
}

document.getElementById("viewBtn").onclick = () => {

    let row=getSelectedRow();
    if(!row) return;

    modal.style.display="block";

    modalTitle.innerHTML="Supplier Details";

    modalBody.innerHTML=`
        <p><b>supplierId:</b> ${row.cells[1].innerText}</p><br>
        <p><b>supplierName:</b> ${row.cells[2].innerText}</p><br>
        <p><b>FieldNo:</b> ${row.cells[3].innerText}</p><br>
        <p><b>supplierAccount:</b> ${row.cells[4].innerText}</p><br>
        <p><b>Phone:</b> ${row.cells[5].innerText}</p><br>
        
    `;
};

document.getElementById("editBtn").onclick = () => {

    let row=getSelectedRow();
    if(!row) return;

    modal.style.display="block";

    modalTitle.innerHTML="Edit Supplier";

    modalBody.innerHTML=`
    <input id="esupplierId" value="${row.cells[1].innerText}">
    <input id="esupplierName" value="${row.cells[2].innerText}">
    <input id="eFieldNo" value="${row.cells[3].innerText}">
    <input id="esupplierAccount" value="${row.cells[4].innerText}">
    <input id="ePhone" value="${row.cells[5].innerText}">
   

    <button onclick="updateSupplier()">Update</button>
    `;

    window.selectedRow=row;
};

function updateSupplier(){

    selectedRow.cells[1].innerText=
    document.getElementById("esupplierId").value;

    selectedRow.cells[2].innerText=
    document.getElementById("esupplierName").value;

    selectedRow.cells[3].innerText=
    document.getElementById("eFieldNo").value;

    selectedRow.cells[4].innerText=
    document.getElementById("esupplierAccount").value;

    selectedRow.cells[5].innerText=
    document.getElementById("ePhone").value;

    

    modal.style.display="none";
}

document.getElementById("deleteBtn").onclick = () => {

    let row=getSelectedRow();
    if(!row) return;

    modal.style.display="block";

    modalTitle.innerHTML="Remove Supplier";

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

