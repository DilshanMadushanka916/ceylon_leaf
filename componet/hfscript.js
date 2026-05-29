document.addEventListener('click', (e) => {
    const dropdownMenu = document.getElementById('dropdownMenu');
    const profileTrigger = document.getElementById('profileTrigger');

    if (!dropdownMenu || !profileTrigger) return;

    if (profileTrigger.contains(e.target)) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    } else if (!dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove('show');
    }
});


