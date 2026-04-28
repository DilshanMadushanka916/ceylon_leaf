// Mock Data for demonstration
const supplierData = {
    'S001': {
        name: "Dilshan",
        field: "Field A",
        date: "2026-04-01",
        kilo: 100,
        price: 120,
        transport: 2000,
        advance: 5000
    },
    'S002': {
        name: "Madushanka",
        field: "Field B",
        date: "2026-04-02",
        kilo: 150,
        price: 120,
        transport: 3000,
        advance: 2000
    }
};

function loadSupplier(id) {
    const data = supplierData[id];
    if (!data) return;

    // Update the Details Card
    document.getElementById('disp-id').innerText = id;
    document.getElementById('disp-name').innerText = data.name;
    
    // Calculate total
    const grossTotal = data.kilo * data.price;
    const finalAmount = grossTotal - (data.transport + data.advance);

    // In a real app, you would update the HTML elements for the bill here
    // Example:
    document.querySelector('.final-amt').innerText = `Final Amount: Rs. ${finalAmount.toLocaleString()}`;
}

// Simple interaction for Download button
document.querySelector('.download-btn').addEventListener('click', () => {
    alert("Generating PDF for " + document.getElementById('disp-name').innerText);
});