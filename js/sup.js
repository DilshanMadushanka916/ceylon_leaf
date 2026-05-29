/* ===========================
   LOAD SUPPLIER DATA
=========================== */
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const supplierId = urlParams.get('id');
    
    if (supplierId) {
        document.getElementById("displayID").innerHTML = `<b>ID:</b> ${supplierId}`;
    }
    
    // Initial calculation on load
    calculate();
};

/* ===========================
   CALCULATION LOGIC
=========================== */
function calculate() {
    let price = parseFloat(document.getElementById("price").value) || 0;
    let rows = document.querySelectorAll("#supplyTable tbody tr");
    let totalKg = 0;
    let totalValue = 0;

    // Calculate Supply Table
    rows.forEach(row => {
        let kg = parseFloat(row.querySelector(".kg").value) || 0;
        let rowValue = kg * price;
        row.querySelector(".value").innerText = rowValue.toFixed(2);
        totalKg += kg;
        totalValue += rowValue;
    });

    document.getElementById("totalKg").innerText = totalKg;
    document.getElementById("totalValue").innerText = totalValue.toFixed(2);
    
    calculateNet(totalValue);
}

function calculateNet(grossValue) {
    // Collect all deduction inputs
    let advance = parseFloat(document.getElementById("advance").value) || 0;
    let fertilizer = parseFloat(document.getElementById("fertilizer").value) || 0;
    let stationary = parseFloat(document.getElementById("stationary").value) || 0;
    let transport = parseFloat(document.getElementById("transport").value) || 0;
    let extra = parseFloat(document.getElementById("extra").value) || 0;

    let totalDeduction = advance + fertilizer + stationary + transport + extra;
    let netPayable = grossValue - totalDeduction;

    // Update UI
    document.getElementById("totalDeduction").innerText = totalDeduction.toFixed(2);
    document.getElementById("deductionDisplay").innerText = totalDeduction.toFixed(2);
    document.getElementById("gross").innerText = grossValue.toFixed(2);
    document.getElementById("net").innerText = netPayable.toFixed(2);
}

// Attach event listener to all inputs to update totals in real-time
document.addEventListener("input", function(e) {
    if (e.target.tagName === 'INPUT') {
        calculate();
    }
});

/* ===========================
   PDF EXPORT
=========================== */
async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const element = document.querySelector("#bill");
    
    try {
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
        pdf.save("Supplier_Statement.pdf");
    } catch (error) {
        console.error("PDF Export failed:", error);
    }
}