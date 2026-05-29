/* ===========================
   LAST 6 MONTHS DATA
=========================== */

const monthlyTea = [42000, 48000, 51000, 56000, 62000, 71000];

const months = [
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
    "Apr"
];

/* ===========================
   CALCULATIONS
=========================== */

// Total Kilo of Tea (Sum of all months)
const totalKilo = monthlyTea.reduce((a, b) => a + b, 0);

// Price Per Kilo
const pricePerKilo = 220;

// Total Payments (Total kg * price)
const totalPayments = totalKilo * pricePerKilo;

// Pending Payments (10% of total)
const pendingPayments = totalPayments * 0.10;

/* ===========================
   UPDATE DASHBOARD UI
=========================== */

// We use .toLocaleString() to add commas for readability (e.g., 1,000,000)
document.querySelector(".tea-total").innerHTML =
    totalKilo.toLocaleString() + " kg";

document.querySelector(".price-kilo").innerHTML =
    "LKR " + pricePerKilo;

document.querySelector(".total-payments").innerHTML =
    "LKR " + totalPayments.toLocaleString();

document.querySelector(".pending-payments").innerHTML =
    "LKR " + pendingPayments.toLocaleString();

/* ===========================
   CHART.JS CONFIGURATION
=========================== */

const ctx = document.getElementById('teaChart');

if (ctx) {
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Tea Collection (kg)',
                data: monthlyTea,
                borderColor: '#0d5c36',
                backgroundColor: 'rgba(13,92,54,0.15)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0d5c36',
                pointBorderColor: '#fff',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

/* ===========================
   NAVIGATION LOGIC
=========================== */

// This function allows the sidebar or cards to navigate to other pages
function navigateTo(page) {
    window.location.href = page;
}

// Example: Adding click listeners to sidebar menu items if they don't have onclick in HTML
document.querySelectorAll('.menu li').forEach((item, index) => {
    item.addEventListener('click', () => {
        // Simple logic to link index to pages
        if (index === 0) window.location.href = 'Accountant.html';
        if (index === 1) window.location.href = 'supplier.html';
    });
});