document.addEventListener('click', (e) => {
    const dropdownMenu = document.getElementById('dropdownMenu');
    const profileTrigger = document.getElementById('profileTrigger');

    // If the dropdown isn't loaded yet, do nothing
    if (!dropdownMenu || !profileTrigger) return;

    // Check if the click was on the trigger (or inside the trigger)
    if (profileTrigger.contains(e.target)) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    } 
    // Close the menu if clicking outside of it
    else if (!dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove('show');
    }
});