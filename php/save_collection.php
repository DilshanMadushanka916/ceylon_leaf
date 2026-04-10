<?php
require 'db_config.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $date = $_POST['collection_date'];
    $field = $_POST['field_no'];
    $supplier = $_POST['supplier_id'];
    $kilos = $_POST['kilos_collected'];

    $stmt = $conn->prepare("INSERT INTO tea_collections (collection_date, field_no, supplier_id, kilos_collected) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("sssd", $date, $field, $supplier, $kilos);

    if ($stmt->execute()) {
        header("Location: /page/record.html?status=success");
    } else {
        echo "Error: " . $stmt->error;
    }
}
?>