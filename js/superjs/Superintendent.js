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

/* TEA CHART */
new Chart(
document.getElementById("teaChart"),
{
    type:"line",

    data:{
        labels:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],

        datasets:[{
            label:"Tea Collection",
            data:[5500,7000,6000,8000,9000,8500,7900],
            borderColor:"#16a34a",
            backgroundColor:"rgba(34,197,94,0.2)",
            fill:true,
            tension:0.4
        }]
    }
}
);

/* GRADE CHART */
new Chart(
document.getElementById("gradeChart"),
{
    type:"doughnut",

    data:{
        labels:["A","B","C"],

        datasets:[{
            data:[45,30,15,10],

            backgroundColor:[
                "#16a34a",
                "#facc15",
                "#ef4444"
            ]
        }]
    }
});

/* PAYMENT CHART */
new Chart(
document.getElementById("paymentChart"),
{
    type:"bar",

    data:{
        labels:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],

        datasets:[{
            label:"Payments",

            data:[
                6000000,
                7500000,
                8000000,
                9200000,
                11000000,
                10100000,
                10300000
            ],

            backgroundColor:"#3b82f6"
        }]
    }
});