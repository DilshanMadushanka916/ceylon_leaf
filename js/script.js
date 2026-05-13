
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
        

            







   