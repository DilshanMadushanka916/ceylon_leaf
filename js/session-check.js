(function() {
    function checkUserStatus() {
        const email = localStorage.getItem('userEmail');
        if (!email) return;

        // Skip check if we are already on the login page
        if (window.location.pathname.endsWith('login.html')) return;

        fetch(`http://localhost:3000/api/user/status?email=${encodeURIComponent(email)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch status');
                }
                return response.json();
            })
            .then(data => {
                if (data.account_status === 'Deactive') {
                    localStorage.removeItem('userEmail');
                    alert("⚠️ Account Not Active. Logging out...");
                    window.location.href = '/page/login.html';
                }
            })
            .catch(err => {
                console.error('Session check error:', err);
            });
    }

    // Check immediately on load
    document.addEventListener('DOMContentLoaded', () => {
        checkUserStatus();
        // Check every 10 seconds
        setInterval(checkUserStatus, 10000);
    });
})();
