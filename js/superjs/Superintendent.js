/* PAGE SWITCH */
function showPage(pageId){

    let pages=document.querySelectorAll(".page");

    pages.forEach(page=>{
        page.classList.remove("active");
    });

    document.getElementById(pageId).classList.add("active");

}

/* DROPDOWN */
function toggleDropdown(){

    let dropdown=document.getElementById("dropdown");

    if(dropdown.style.display==="block"){
        dropdown.style.display="none";
    }
    else{
        dropdown.style.display="block";
    }

}

// Load Dashboard Data on Page Load
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    setupMonthListeners();
});

// Setup month filter listeners
function setupMonthListeners() {
    // Tea chart month buttons
    const teaMonthBtns = document.querySelectorAll('.month-btn');
    teaMonthBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const month = this.dataset.month;
            
            // Update button styles
            teaMonthBtns.forEach(b => {
                b.style.backgroundColor = '';
                b.style.color = '';
            });
            this.style.backgroundColor = '#16a34a';
            this.style.color = 'white';
            
            // Update chart
            loadTeaChart(month);
            loadGradeChart(month);
        });
    });
    
    // Payment chart month buttons
    const paymentMonthBtns = document.querySelectorAll('.payment-month-btn');
    paymentMonthBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const month = this.dataset.month;
            
            // Update button styles
            paymentMonthBtns.forEach(b => {
                b.style.backgroundColor = '';
                b.style.color = '';
            });
            this.style.backgroundColor = '#3b82f6';
            this.style.color = 'white';
            
            // Update chart
            loadPaymentChart(month);
        });
    });
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        // Get today's collection
        const collectionResponse = await fetch('/api/superintendent/dashboard/today-collection');
        const collectionData = await collectionResponse.json();
        
        // Get price per kilo
        const priceResponse = await fetch('/api/superintendent/dashboard/price-per-kilo');
        const priceData = await priceResponse.json();
        
        // Get payments
        const paymentsResponse = await fetch('/api/superintendent/dashboard/payments-today');
        const paymentsData = await paymentsResponse.json();
        
        // Update card values - fix selector to use .card.green (with dot) not .card green
        const greenCardH1 = document.querySelector('.card.green h1');
        const orangeCardH1 = document.querySelector('.card.orange h1');
        const blueCardH1 = document.querySelector('.card.blue h1');
        
        if (greenCardH1) greenCardH1.textContent = collectionData.total_net_weight.toLocaleString() + ' kg';
        if (orangeCardH1) orangeCardH1.textContent = 'LKR ' + priceData.price_per_kg.toLocaleString();
        if (blueCardH1) blueCardH1.textContent = 'LKR ' + paymentsData.total_payments.toLocaleString();
        
        // Load charts
        loadTeaChart();
        loadGradeChart();
        loadPaymentChart();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load Tea Collection Chart (Monthly Data)
async function loadTeaChart(month) {
    try {
        const selectedMonth = month || new Date().toISOString().substring(0, 7);
        const response = await fetch(`/api/superintendent/dashboard/monthly-collection?month=${selectedMonth}`);
        const data = await response.json();
        
        const labels = data.map(d => {
            const date = new Date(d.date + 'T00:00:00');
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const values = data.map(d => d.daily_collection);
        
        const ctx = document.getElementById("teaChart");
        if (window.teaChartInstance) {
            window.teaChartInstance.destroy();
        }
        
        window.teaChartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Tea Collection (kg)",
                    data: values,
                    borderColor: "#16a34a",
                    backgroundColor: "rgba(34,197,94,0.2)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: "#16a34a",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y.toFixed(2) + ' kg';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading tea chart:', error);
    }
}

// Load Grade Distribution Chart
async function loadGradeChart(month) {
    try {
        const selectedMonth = month || new Date().toISOString().substring(0, 7);
        const response = await fetch(`/api/superintendent/dashboard/collection-by-grade?month=${selectedMonth}`);
        const data = await response.json();
        
        const labels = data.map(d => 'Grade ' + d.grade);
        const values = data.map(d => parseFloat(d.total_weight) || 0);
        
        const ctx = document.getElementById("gradeChart");
        if (window.gradeChartInstance) {
            window.gradeChartInstance.destroy();
        }
        
        window.gradeChartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        "#16a34a",
                        "#facc15",
                        "#ef4444",
                        "#3b82f6"
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    ChartDataLabels: {
                        color: '#fff',
                        font: {
                            weight: 'bold',
                            size: 12
                        },
                        formatter: function(value, context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return percentage + '%';
                        }
                    },
                    legend: {
                        display: true
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        displayColors: true,
                        callbacks: {
                            title: function(tooltipItems) {
                                if (tooltipItems.length > 0) {
                                    return tooltipItems[0].label;
                                }
                                return '';
                            },
                            label: function(context) {
                                let label = '';
                                if (context.parsed !== null) {
                                    const dataArray = context.dataset.data;
                                    const total = dataArray.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    label = context.parsed.toFixed(2) + ' kg (' + percentage + '%)';
                                }
                                return label;
                            }
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    } catch (error) {
        console.error('Error loading grade chart:', error);
    }
}

// Load Payment Trends Chart
async function loadPaymentChart(month) {
    try {
        const selectedMonth = month || new Date().toISOString().substring(0, 7);
        const response = await fetch(`/api/superintendent/dashboard/payment-trends?month=${selectedMonth}`);
        const data = await response.json();
        
        const labels = data.map(d => d.label);
        const values = data.map(d => d.total_amount);
        
        // Create color mapping based on payment method
        const colors = data.map(d => {
            if (d.payment_method === 'Bank Transfer') return '#3b82f6';
            if (d.payment_method === 'Cash') return '#10b981';
            return '#6b7280';
        });
        
        const ctx = document.getElementById("paymentChart");
        if (window.paymentChartInstance) {
            window.paymentChartInstance.destroy();
        }
        
        window.paymentChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Payments (LKR)",
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 5,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: function(context) {
                                return 'LKR ' + context.parsed.y.toLocaleString('en-LK', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'LKR ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading payment chart:', error);
    }
}