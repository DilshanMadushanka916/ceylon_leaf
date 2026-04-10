<?php
$host = "localhost";
$db_user = "root";
$db_pass = "1234";
$db_name = "ceylon_leaf";

$conn = new mysqli($host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>