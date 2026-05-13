
        fetch('/componet/header.html')
            .then(response => response.text())
            .then(data => {
                document.getElementById('header').innerHTML = data;
            })
            .catch(error => console.error('Error loading header:', error));
        fetch('/componet/footer.html')
            .then(response => response.text())
            .then(data => {
                document.getElementById('footer').innerHTML = data;
            })
            .catch(error => console.error('Error loading footer:', error));
        

            




async function fetchRecords() {
    const tableBody = document.getElementById('records-data');
    if (!tableBody) {
        console.error("❌ Could not find element with ID 'records-data'");
        return;
    }

    try {
        // Use an absolute path to be safe
        const response = await fetch('http://localhost:3000/api/records');
        
        console.log("Response Status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log("Data received from DB:", data);

        if (!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No records found in database.</td></tr>';
            return;
        }

        tableBody.innerHTML = ''; // Clear the "Error" message or old data

        data.forEach(record => {
            const row = document.createElement('tr');
            const date = new Date(record.collection_date).toLocaleDateString();

            row.innerHTML = `
                <td>${date}</td>
                <td>${record.supplier_id}</td>
                <td>${record.field_no}</td>
                <td>${record.kilos_collected} kg</td>
                <td><span class="status-badge">Completed</span></td>
                <td><button class="view-btn">View</button></td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Detailed Error Context:', error);
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red;">Error: ${error.message}</td></tr>`;
    }
}


   