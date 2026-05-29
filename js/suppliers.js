function openProfile(supplierId) {
    // Redirects to the specific supplier bill page with the ID as a parameter
    window.location.href = "sup.html?id=" + supplierId;
}

const searchInput = document.getElementById("searchInput");
searchInput.addEventListener("keyup", function() {
    let filter = searchInput.value.toLowerCase();
    let rows = document.querySelectorAll("#supplierTable tbody tr");

    rows.forEach(function(row) {
        let supplierId = row.cells[0].textContent.toLowerCase();
        let supplierName = row.cells[1].textContent.toLowerCase();

        if (supplierId.includes(filter) || supplierName.includes(filter)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
});