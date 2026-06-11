// SIDEBAR ACTIVE EFFECT
const menuLinks = document.querySelectorAll(".menu a");

menuLinks.forEach(link => {

    link.addEventListener("click", function(){

        menuLinks.forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");

    });

});


// ===============================
// VIEW REPORT BUTTONS
// ===============================

// VIEW BUTTONS
const viewButtons = document.querySelectorAll(".view-btn");

viewButtons.forEach((button,index) => {

    button.addEventListener("click", () => {

        if(index === 0){

            window.location.href =
            "daily-green-leaf-report.html";

        }

        else if(index === 1){

            window.location.href =
            "leaf-quality-report.html";

        }

        else if(index === 2){

            window.location.href =
            "supplier-payment-report.html";

        }

    });

});

function goBack() {
    window.location.href = "reports.html";
}


// ===============================
// DOWNLOAD REPORT BUTTONS
// ===============================

const downloadButtons =
document.querySelectorAll(".download-btn");

downloadButtons.forEach((button,index) => {

    button.addEventListener("click", () => {

        let link = document.createElement("a");

        // REPORT 1 PDF
        if(index === 0){

            link.href =
            "reports/daily-green-leaf-report.pdf";

            link.download =
            "Daily-Green-Leaf-Report.pdf";

        }

        // REPORT 2 PDF
        else if(index === 1){

            link.href =
            "reports/leaf-quality-report.pdf";

            link.download =
            "Leaf-Quality-Report.pdf";

        }

        // REPORT 3 PDF
        else if(index === 2){

            link.href =
            "reports/supplier-payment-summary.pdf";

            link.download =
            "Supplier-Payment-Summary.pdf";

        }

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

    });

});


// PAGE LOAD ANIMATION
window.addEventListener("load", () => {

    document.body.style.opacity = "0";

    document.body.style.transition = "0.4s";

    setTimeout(() => {

        document.body.style.opacity = "1";

    },100);

});