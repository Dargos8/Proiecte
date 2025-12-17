<?php
/**
 * admin.php - Pagina de administrare
 * Această pagină permite administratorului să gestioneze diferite tabele din baza de date
 */
// Modificăm calea de salvare a sesiunii pentru a corespunde cu cea din login.php
$tmpPath = __DIR__ . '/tmp';

if (!file_exists($tmpPath)) {
    mkdir($tmpPath, 0777, true); // creează recursiv folderul cu permisiuni
}

// Setează calea folderului de sesiune la acel tmp local
session_save_path($tmpPath);

// Activează afișarea erorilor pentru debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Verificăm dacă este deschisă o sesiune
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// PROCESARE AJAX - Trebuie să fie înainte de orice HTML output
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    // Verificăm dacă utilizatorul este autentificat și este admin pentru toate acțiunile AJAX
    if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || 
        !isset($_SESSION['userType']) || $_SESSION['userType'] !== 'admin') {
        
        // Pentru cereri AJAX, returnăm JSON
        if ($_POST['action'] === 'view_sql_history') {
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        // Pentru alte cereri, redirecționăm
        header("Location: login.php");
        exit;
    }
    
    // Procesăm cererea pentru istoricul SQL
    if ($_POST['action'] === 'view_sql_history') {
        $limit = isset($_POST['history_limit']) ? (int)$_POST['history_limit'] : 100;
        
        // Funcție pentru citirea istoricului SQL
        function getSQLHistoryAjax($limit = 100) {
            $logFile = __DIR__ . '/sql_history.log';
            
            if (!file_exists($logFile)) {
                return [];
            }
            
            $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            $lines = array_reverse($lines); // Cele mai recente primul
            
            if ($limit > 0) {
                $lines = array_slice($lines, 0, $limit);
            }
            
            $history = [];
            foreach ($lines as $line) {
                if (preg_match('/\[(.*?)\] User: (.*?) \| IP: (.*?) \| Table: (.*?) \| Command: (.*?) \| Result: (.*)/', $line, $matches)) {
                    $history[] = [
                        'timestamp' => $matches[1],
                        'user' => $matches[2],
                        'ip' => $matches[3],
                        'table' => $matches[4],
                        'command' => $matches[5],
                        'result' => $matches[6]
                    ];
                }
            }
            
            return $history;
        }
        
        $sqlHistory = getSQLHistoryAjax($limit);
        
        header('Content-Type: application/json');
        echo json_encode($sqlHistory);
        exit();
    }
}

// Verificăm dacă utilizatorul este autentificat și este admin pentru accesul normal la pagină
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || 
    !isset($_SESSION['userType']) || $_SESSION['userType'] !== 'admin') {
    // Dacă nu este autentificat sau nu este admin, redirecționăm către pagina de login
    header("Location: login.php");
    exit;
}

// Adăugăm cod de debugging pentru a vedea valorile sesiunii
echo "<!-- DEBUG ADMIN: ";
var_dump($_SESSION);
echo " -->";

// Verificăm dacă există un mesaj de autentificare
if (isset($_SESSION['login_message'])) {
    // Afișăm mesajul de autentificare
    echo "<script>alert('" . htmlspecialchars($_SESSION['login_message']) . "');</script>";
    // Ștergem mesajul pentru a nu fi afișat din nou la refresh
    unset($_SESSION['login_message']);
}

// Includem fișierul cu clasa DataBase
require_once 'database.php';

// Tabelul curent vizualizat (implicit "Utilizatori")
$currentTable = isset($_GET['table']) ? $_GET['table'] : 'Utilizatori';

// Inițializăm conexiunea la baza de date
$dbConnection = new DataBase();
$con = $dbConnection->getConexiune();

// Funcție pentru logarea comenzilor SQL
function logSQLCommand($command, $table = '', $result = '') {
    $logFile = __DIR__ . '/sql_history.log';
    $timestamp = date('Y-m-d H:i:s');
    $user = $_SESSION['username'] ?? 'Unknown';
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
    
    $logEntry = "[{$timestamp}] User: {$user} | IP: {$ip} | Table: {$table} | Command: {$command} | Result: {$result}\n";
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// Funcție pentru a obține toate datele dintr-un tabel specificat
function getTableData($con, $tableName, $searchTerm = '', $filterColumn = '', $filterValue = '') {
    $data = [];
    $columns = [];
    
    // Obține informații despre coloanele tabelului
    $columnsQuery = "SHOW COLUMNS FROM $tableName";
    $columnsResult = $con->query($columnsQuery);
    
    if ($columnsResult) {
        while ($column = $columnsResult->fetch_assoc()) {
            $columns[] = $column['Field'];
        }
        
        // Construiește query-ul SQL pentru selecția datelor
        $query = "SELECT * FROM $tableName";
        
        // Adăugăm condiția de căutare dacă există un termen de căutare
        if (!empty($searchTerm)) {
            $searchConditions = [];
            foreach ($columns as $column) {
                $searchConditions[] = "$column LIKE '%$searchTerm%'";
            }
            $query .= " WHERE " . implode(" OR ", $searchConditions);
        }
        
        // Adăugăm condiția de filtrare dacă există
        if (!empty($filterColumn) && !empty($filterValue)) {
            if (empty($searchTerm)) {
                $query .= " WHERE $filterColumn = '$filterValue'";
            } else {
                $query .= " AND $filterColumn = '$filterValue'";
            }
        }
        
        $result = $con->query($query);
        if ($result) {
            logSQLCommand($query, $tableName, 'Success - ' . $result->num_rows . ' rows returned');
        } else {
            logSQLCommand($query, $tableName, 'Error: ' . $con->error);
        }
        
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
        }
    }
    
    return ['columns' => $columns, 'data' => $data];
}

// Funcție pentru exportul în Excel
function exportToExcel($tableName, $data, $columns) {
    // Setăm headerele pentru a forța descărcarea
    header('Content-Type: application/vnd.ms-excel');
    header('Content-Disposition: attachment;filename="' . $tableName . '_export_' . date('Y-m-d') . '.xls"');
    header('Cache-Control: max-age=0');
    
    // Creăm output-ul Excel
    echo '<table border="1">';
    
    // Header-ele coloanelor
    echo '<tr>';
    foreach ($columns as $column) {
        echo '<th>' . htmlspecialchars($column) . '</th>';
    }
    echo '</tr>';
    
    // Datele
    foreach ($data as $row) {
        echo '<tr>';
        foreach ($columns as $column) {
            echo '<td>' . htmlspecialchars($row[$column]) . '</td>';
        }
        echo '</tr>';
    }
    
    echo '</table>';
    exit;
}

// Funcție pentru exportul în PDF
function exportToPDF($tableName, $data, $columns) {
    // Verificăm dacă TCPDF este disponibil, dacă nu trimitem o eroare
    if (!class_exists('TCPDF')) {
        echo json_encode(['error' => 'TCPDF library is not available. Please install it.']);
        exit;
    }
    
    // Creăm un nou document PDF
    $pdf = new TCPDF('L', 'mm', 'A4', true, 'UTF-8', false);
    
    // Setăm informațiile documentului
    $pdf->SetCreator('Admin Panel');
    $pdf->SetAuthor('Agenție Turism');
    $pdf->SetTitle($tableName . ' Export');
    $pdf->SetSubject($tableName . ' Data');
    
    // Setăm marginile
    $pdf->SetMargins(10, 10, 10);
    $pdf->SetHeaderMargin(5);
    $pdf->SetFooterMargin(10);
    
    // Setăm auto page breaks
    $pdf->SetAutoPageBreak(TRUE, 10);
    
    // Adăugăm o pagină
    $pdf->AddPage();
    
    // Adăugăm titlul
    $pdf->SetFont('helvetica', 'B', 16);
    $pdf->Cell(0, 10, $tableName . ' - Export Data', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Ln(5);
    
    // Calculăm lățimea coloanelor
    $width = (270 - 20) / count($columns);
    
    // Adăugăm header-ele tabelului
    $pdf->SetFillColor(230, 230, 230);
    $pdf->SetFont('helvetica', 'B', 10);
    
    foreach ($columns as $column) {
        $pdf->Cell($width, 7, $column, 1, 0, 'C', 1);
    }
    $pdf->Ln();
    
    // Adăugăm datele
    $pdf->SetFont('helvetica', '', 10);
    foreach ($data as $row) {
        foreach ($columns as $column) {
            $pdf->Cell($width, 6, $row[$column], 1, 0, 'L');
        }
        $pdf->Ln();
    }
    
    // Trimitem PDF-ul către browser
    $pdf->Output($tableName . '_export_' . date('Y-m-d') . '.pdf', 'D');
    exit;
}

// Procesarea importului din Excel
function importFromExcel($con, $tableName, $file) {
    // Verificăm dacă fișierul a fost încărcat cu succes
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return "Eroare la încărcarea fișierului: " . $file['error'];
    }
    
    // Verificăm extensia fișierului
    $allowedExtensions = ['xls', 'xlsx', 'csv'];
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($fileExtension, $allowedExtensions)) {
        return "Extensie de fișier neacceptată. Vă rugăm să încărcați un fișier Excel sau CSV.";
    }
    
    // Verificăm tipul MIME al fișierului
    $allowedMimeTypes = [
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/plain'
    ];
    
    if (!in_array($file['type'], $allowedMimeTypes)) {
        return "Tip de fișier neacceptat. Vă rugăm să încărcați un fișier Excel sau CSV.";
    }
    
    // Obținem coloanele tabelului
    $columnsQuery = "SHOW COLUMNS FROM $tableName";
    $columnsResult = $con->query($columnsQuery);
    $columns = [];
    
    if ($columnsResult) {
        while ($column = $columnsResult->fetch_assoc()) {
            $columns[] = $column['Field'];
        }
    } else {
        return "Eroare la obținerea structurii tabelului.";
    }
    
    // Procesăm fișierul în funcție de extensie
    if ($fileExtension === 'csv') {
        // Procesăm CSV
        $handle = fopen($file['tmp_name'], 'r');
        
        if ($handle !== FALSE) {
            // Citim antetul (prima linie)
            $header = fgetcsv($handle);
            
            // Verificăm dacă antetul corespunde coloanelor
            $validColumns = [];
            foreach ($header as $index => $columnName) {
                if (in_array($columnName, $columns)) {
                    $validColumns[$index] = $columnName;
                }
            }
            
            if (empty($validColumns)) {
                return "Antetul CSV-ului nu conține coloane valide pentru tabelul $tableName.";
            }
            
            // Pregătim interogarea de inserare
            $insertColumns = implode(", ", array_values($validColumns));
            
            // Citim și procesăm datele
            $successCount = 0;
            $errorCount = 0;
            
            while (($data = fgetcsv($handle)) !== FALSE) {
                $values = [];
                
                foreach ($validColumns as $index => $columnName) {
                    if (isset($data[$index])) {
                        $values[] = "'" . $con->real_escape_string($data[$index]) . "'";
                    } else {
                        $values[] = "NULL";
                    }
                }
                
                $insertValues = implode(", ", $values);
                $insertQuery = "INSERT INTO $tableName ($insertColumns) VALUES ($insertValues)";
                
                if ($con->query($insertQuery)) {
                    $successCount++;
                } else {
                    $errorCount++;
                }
            }
            
            fclose($handle);
            return "Import finalizat: $successCount înregistrări adăugate cu succes, $errorCount erori.";
        } else {
            return "Eroare la deschiderea fișierului CSV.";
        }
    } else {
        // Pentru fișiere Excel, trebuie să folosim o bibliotecă precum PhpSpreadsheet
        // Acest cod presupune că aveți instalat PhpSpreadsheet prin Composer
        if (!class_exists('PhpOffice\PhpSpreadsheet\IOFactory')) {
            return "Biblioteca PhpSpreadsheet nu este disponibilă. Vă rugăm să o instalați.";
        }
        
        try {
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file['tmp_name']);
            $worksheet = $spreadsheet->getActiveSheet();
            $data = $worksheet->toArray();
            
            // Prima linie este antetul
            $header = array_shift($data);
            
            // Verificăm dacă antetul corespunde coloanelor
            $validColumns = [];
            foreach ($header as $index => $columnName) {
                if (in_array($columnName, $columns)) {
                    $validColumns[$index] = $columnName;
                }
            }
            
            if (empty($validColumns)) {
                return "Antetul Excel-ului nu conține coloane valide pentru tabelul $tableName.";
            }
            
            // Pregătim interogarea de inserare
            $insertColumns = implode(", ", array_values($validColumns));
            
            // Procesăm datele
            $successCount = 0;
            $errorCount = 0;
            
            foreach ($data as $row) {
                $values = [];
                
                foreach ($validColumns as $index => $columnName) {
                    if (isset($row[$index]) && $row[$index] !== '') {
                        $values[] = "'" . $con->real_escape_string($row[$index]) . "'";
                    } else {
                        $values[] = "NULL";
                    }
                }
                
                if (!empty($values)) {
                    $insertValues = implode(", ", $values);
                    $insertQuery = "INSERT INTO $tableName ($insertColumns) VALUES ($insertValues)";
                    
                    if ($con->query($insertQuery)) {
                        $successCount++;
                    } else {
                        $errorCount++;
                    }
                }
            }
            
            return "Import finalizat: $successCount înregistrări adăugate cu succes, $errorCount erori.";
        } catch (Exception $e) {
            return "Eroare la procesarea fișierului Excel: " . $e->getMessage();
        }
    }
}

// Procesăm acțiunile (export, import, adăugare, editare, ștergere)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = isset($_POST['action']) ? $_POST['action'] : '';
    
    // Procesăm exportul
    if ($action === 'export') {
        $format = isset($_POST['format']) ? $_POST['format'] : '';
        $tableName = isset($_POST['table']) ? $_POST['table'] : '';
        
        if (!empty($tableName) && !empty($format)) {
            // Obținem datele tabelului
            $tableData = getTableData($con, $tableName);
            $columns = $tableData['columns'];
            $data = $tableData['data'];
            
            if ($format === 'excel') {
                exportToExcel($tableName, $data, $columns);
            } elseif ($format === 'pdf') {
                exportToPDF($tableName, $data, $columns);
            }
        }
    }
    // Procesăm importul
    elseif ($action === 'import') {
        $tableName = isset($_POST['table']) ? $_POST['table'] : '';
        
        if (!empty($tableName) && isset($_FILES['import_file'])) {
            $importResult = importFromExcel($con, $tableName, $_FILES['import_file']);
            if (strpos($importResult, 'Import finalizat') !== false) {
                $successMessage = $importResult;
            } else {
                $errorMessage = $importResult;
            }
        }
    }
    // Procesăm adăugarea unui nou rând
    elseif ($action === 'add') {
        // Procesăm adăugarea unui nou rând
        $tableName = isset($_POST['table']) ? $_POST['table'] : '';
        
        if (!empty($tableName)) {
            $columns = [];
            $values = [];
            
            foreach ($_POST as $key => $value) {
                // Excludem câmpurile de acțiune și tabel din inserare
                if ($key !== 'action' && $key !== 'table') {
                    $columns[] = $key;
                    $values[] = "'" . $con->real_escape_string($value) . "'";
                }
            }
            
            if (!empty($columns)) {
                $query = "INSERT INTO $tableName (" . implode(", ", $columns) . ") VALUES (" . implode(", ", $values) . ")";
                
                if ($con->query($query)) {
                    $successMessage = "Înregistrare adăugată cu succes!";
                    logSQLCommand($query, $tableName, 'Success - Insert');
                } else {
                    $errorMessage = "Eroare la adăugarea înregistrării: " . $con->error;
                    logSQLCommand($query, $tableName, 'Error: ' . $con->error);
                }
            }
        }
    } 
    // Procesăm editarea unui rând existent
    elseif ($action === 'edit') {
        // Procesăm editarea unui rând existent
        $tableName = isset($_POST['table']) ? $_POST['table'] : '';
        $primaryKey = isset($_POST['primary_key']) ? $_POST['primary_key'] : '';
        $primaryKeyValue = isset($_POST['primary_key_value']) ? $_POST['primary_key_value'] : '';
        
        if (!empty($tableName) && !empty($primaryKey) && !empty($primaryKeyValue)) {
            $updateValues = [];
            
            foreach ($_POST as $key => $value) {
                // Excludem câmpurile de acțiune, tabel și cheia primară din actualizare
                if ($key !== 'action' && $key !== 'table' && $key !== 'primary_key' && $key !== 'primary_key_value') {
                    $updateValues[] = "$key = '" . $con->real_escape_string($value) . "'";
                }
            }
            
            if (!empty($updateValues)) {
                $query = "UPDATE $tableName SET " . implode(", ", $updateValues) . " WHERE $primaryKey = '$primaryKeyValue'";
                
                if ($con->query($query)) {
                    $successMessage = "Înregistrare actualizată cu succes!";
                    logSQLCommand($query, $tableName, 'Success - Update');
                } else {
                    $errorMessage = "Eroare la actualizarea înregistrării: " . $con->error;
                    logSQLCommand($query, $tableName, 'Error: ' . $con->error);
                }
            }
        }
    } 
    // Procesăm ștergerea unui rând
    elseif ($action === 'delete') {
        // Procesăm ștergerea unui rând
        $tableName = isset($_POST['table']) ? $_POST['table'] : '';
        $primaryKey = isset($_POST['primary_key']) ? $_POST['primary_key'] : '';
        $primaryKeyValue = isset($_POST['primary_key_value']) ? $_POST['primary_key_value'] : '';
        
        if (!empty($tableName) && !empty($primaryKey) && !empty($primaryKeyValue)) {
            $query = "DELETE FROM $tableName WHERE $primaryKey = '$primaryKeyValue'";
            
            if ($con->query($query)) {
                $successMessage = "Înregistrare ștearsă cu succes!";
                logSQLCommand($query, $tableName, 'Success - Delete');
            } else {
                $errorMessage = "Eroare la ștergerea înregistrării: " . $con->error;
                logSQLCommand($query, $tableName, 'Error: ' . $con->error);
            }
        }
    }
}

// Obținem termenii de căutare și filtrare
$searchTerm = isset($_GET['search']) ? $_GET['search'] : '';
$filterColumn = isset($_GET['filter_column']) ? $_GET['filter_column'] : '';
$filterValue = isset($_GET['filter_value']) ? $_GET['filter_value'] : '';

// Obținem datele pentru tabelul curent
$tableData = getTableData($con, $currentTable, $searchTerm, $filterColumn, $filterValue);
$columns = $tableData['columns'];
$data = $tableData['data'];

// Determinăm cheia primară a tabelului curent
$primaryKey = '';
$primaryKeyQuery = "SHOW KEYS FROM $currentTable WHERE Key_name = 'PRIMARY'";
$primaryKeyResult = $con->query($primaryKeyQuery);

if ($primaryKeyResult && $primaryKeyResult->num_rows > 0) {
    $primaryKeyRow = $primaryKeyResult->fetch_assoc();
    $primaryKey = $primaryKeyRow['Column_name'];
}

// Închidem conexiunea (va fi redeschisă când este nevoie)
$con->close();
?>

<!DOCTYPE html>
<html lang="ro">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Agenție Turism</title>
	<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        /* Stilurile CSS rămân neschimbate */
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f4f7f9;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background-color: #2c3e50;
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        h1 {
            margin: 0;
            font-size: 24px;
        }
        
        .user-info {
            display: flex;
            align-items: center;
        }
        
        .user-info span {
            margin-right: 15px;
        }
        
        .logout-btn {
            background-color: #e74c3c;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
        }
        
        .logout-btn:hover {
            background-color: #c0392b;
        }
        
        .tabs {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 1px solid #ddd;
            overflow-x: auto;
        }
        
        .tab {
            padding: 10px 20px;
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            border-bottom: none;
            border-radius: 5px 5px 0 0;
            margin-right: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
            white-space: nowrap;
        }
        
        .tab.active {
            background-color: #3498db;
            color: white;
            border-color: #3498db;
        }
        
        .tab:hover:not(.active) {
            background-color: #e9ecef;
        }
        
        .search-filter-container {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .search-container {
            display: flex;
            align-items: center;
            width: 100%;
            max-width: 400px;
            margin-bottom: 10px;
        }
        
        .search-container input {
            flex-grow: 1;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px 0 0 4px;
            font-size: 14px;
        }
        
        .search-btn {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 0 4px 4px 0;
            cursor: pointer;
            font-size: 14px;
        }
        
        .filter-container {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .filter-container select, .filter-container input {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-right: 10px;
            font-size: 14px;
        }
        
        .filter-btn {
            background-color: #2ecc71;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background-color: white;
            border-radius: 5px;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #34495e;
            color: white;
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        tr:hover {
            background-color: #f1f1f1;
        }
        
        .actions {
            display: flex;
            justify-content: space-around;
        }
        
        .btn {
            padding: 6px 10px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
        }
        
        .btn-edit {
            background-color: #3498db;
            color: white;
        }
        
        .btn-delete {
            background-color: #e74c3c;
            color: white;
        }
        
        .btn-edit:hover {
            background-color: #2980b9;
        }
        
        .btn-delete:hover {
            background-color: #c0392b;
        }
        
        .add-row {
            margin-top: 20px;
            background-color: #2ecc71;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            display: inline-flex;
            align-items: center;
            transition: background-color 0.3s;
        }
        
        .add-row i {
            margin-right: 10px;
        }
        
        .add-row:hover {
            background-color: #27ae60;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.5);
        }
        
        .modal-content {
            background-color: white;
            margin: 10% auto;
            padding: 20px;
            border-radius: 5px;
            width: 80%;
            max-width: 600px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            animation: modalOpen 0.4s;
        }
        
        @keyframes modalOpen {
            from {opacity: 0; transform: translateY(-50px);}
            to {opacity: 1; transform: translateY(0);}
        }
        
        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .close:hover {
            color: black;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        .form-group input, .form-group select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .form-actions {
            text-align: right;
            margin-top: 20px;
        }
        
        .btn-save {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        
        .btn-cancel {
            background-color: #95a5a6;
            color: white;
            border: none;
            padding: 8px 15px;
            margin-right: 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        
        .alert {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
        }
        
        .alert-success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-danger {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .no-data {
            text-align: center;
            padding: 20px;
            font-style: italic;
            color: #777;
        }
        
        /* Stiluri noi pentru butoanele de export/import */
        .export-import-container {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .export-container, .import-container {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }

.export-btn, .import-btn {
            padding: 8px 15px;
            margin-right: 5px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            color: white;
        }
        
        .export-btn {
            background-color: #9b59b6;
        }
        
        .export-btn:hover {
            background-color: #8e44ad;
        }
        
        .import-btn {
            background-color: #f39c12;
        }
        
        .import-btn:hover {
            background-color: #d35400;
        }
        
        .export-format {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-right: 10px;
            font-size: 14px;
        }
        
        .import-file {
            margin-right: 10px;
        }
        
        /* Stiluri pentru responsivitate */
        @media (max-width: 768px) {
            .search-filter-container, .export-import-container {
                flex-direction: column;
            }
            
            .search-container, .filter-container, .export-container, .import-container {
                width: 100%;
                margin-bottom: 15px;
            }
            
            table {
                display: block;
                overflow-x: auto;
            }
        }
		
		.sql-history-btn {
    background-color: #8e44ad;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    margin: 10px 0;
    display: inline-flex;
    align-items: center;
    transition: background-color 0.3s;
}

.sql-history-btn:hover {
    background-color: #732d91;
}

.sql-history-btn i {
    margin-right: 10px;
}

/* Stiluri pentru modalul de istoric */
#sqlHistoryModal .modal-content {
    width: 95%;
    max-width: 1200px;
    max-height: 80vh;
    overflow-y: auto;
}

.history-controls {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
}

.history-controls label {
    margin-right: 10px;
    font-weight: bold;
}

.history-controls select {
    margin-right: 15px;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.history-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 12px;
}

.history-table th,
.history-table td {
    padding: 8px;
    text-align: left;
    border-bottom: 1px solid #ddd;
    word-wrap: break-word;
}

.history-table th {
    background-color: #34495e;
    color: white;
    position: sticky;
    top: 0;
}

.history-table tr:nth-child(even) {
    background-color: #f8f9fa;
}

.history-table tr:hover {
    background-color: #e8f4f8;
}

.command-cell {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.command-cell:hover {
    white-space: normal;
    word-wrap: break-word;
}

.result-success {
    color: #27ae60;
    font-weight: bold;
}

.result-error {
    color: #e74c3c;
    font-weight: bold;
}

.clear-history-btn {
    background-color: #e74c3c;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    margin-left: 15px;
}

.clear-history-btn:hover {
    background-color: #c0392b;
}

.loading {
    text-align: center;
    padding: 20px;
    font-style: italic;
    color: #666;
}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Admin Panel - Agenție Turism</h1>
            <div class="user-info">
                <span>Bine ai venit, <?php echo htmlspecialchars($_SESSION['username'] ?? 'Admin'); ?></span>
                <a href="logout.php" class="logout-btn">Deconectare</a>
            </div>
        </header>
        
        <?php if (isset($successMessage)): ?>
            <div class="alert alert-success"><?php echo $successMessage; ?></div>
        <?php endif; ?>
        
        <?php if (isset($errorMessage)): ?>
            <div class="alert alert-danger"><?php echo $errorMessage; ?></div>
        <?php endif; ?>
        
        <div class="tabs">
            <?php
            // Obținem lista tabelelor din baza de date
            $dbConnection = new DataBase();
            $con = $dbConnection->getConexiune();
            $tablesQuery = "SHOW TABLES";
            $tablesResult = $con->query($tablesQuery);
            
            if ($tablesResult) {
                while ($table = $tablesResult->fetch_row()) {
                    $tableName = $table[0];
                    $activeClass = ($currentTable === $tableName) ? 'active' : '';
                    echo "<a href='?table=$tableName' class='tab $activeClass'>$tableName</a>";
                }
            }
            
            $con->close();
            ?>
        </div>
        
		<!-- Buton pentru deschiderea istoricului SQL -->
<button class="sql-history-btn" onclick="openSQLHistoryModal()">
    <i class="fas fa-history"></i> Istoric Comenzi SQL
</button>

<!-- Modal pentru istoric SQL -->
<div id="sqlHistoryModal" class="modal">
    <div class="modal-content">
        <span class="close" onclick="closeSQLHistoryModal()">&times;</span>
        <h2>Istoric Comenzi SQL</h2>
        
        <div class="history-controls">
            <label for="historyLimit">Numărul de intrări:</label>
            <select id="historyLimit" onchange="loadSQLHistory()">
                <option value="50">50</option>
                <option value="100" selected>100</option>
                <option value="200">200</option>
                <option value="500">500</option>
                <option value="0">Toate</option>
            </select>
            
            <button class="clear-history-btn" onclick="clearSQLHistory()">
                <i class="fas fa-trash"></i> Șterge Istoric
            </button>
        </div>
        
        <div id="historyContent">
            <div class="loading">Se încarcă istoricul...</div>
        </div>
    </div>
</div>

		
		
        <div class="search-filter-container">
            <form method="GET" action="" class="search-container">
                <input type="hidden" name="table" value="<?php echo htmlspecialchars($currentTable); ?>">
                <input type="text" name="search" placeholder="Caută..." value="<?php echo htmlspecialchars($searchTerm); ?>">
                <button type="submit" class="search-btn"><i class="fas fa-search"></i></button>
            </form>
            
            <form method="GET" action="" class="filter-container">
                <input type="hidden" name="table" value="<?php echo htmlspecialchars($currentTable); ?>">
                <select name="filter_column">
                    <option value="">Selectează coloană...</option>
                    <?php foreach ($columns as $column): ?>
                        <option value="<?php echo htmlspecialchars($column); ?>" <?php echo ($filterColumn === $column) ? 'selected' : ''; ?>><?php echo htmlspecialchars($column); ?></option>
                    <?php endforeach; ?>
                </select>
                <input type="text" name="filter_value" placeholder="Valoare filtru..." value="<?php echo htmlspecialchars($filterValue); ?>">
                <button type="submit" class="filter-btn"><i class="fas fa-filter"></i> Filtru</button>
            </form>
        </div>
        
        <div class="export-import-container">
            <div class="export-container">
                <form method="POST" action="">
                    <input type="hidden" name="action" value="export">
                    <input type="hidden" name="table" value="<?php echo htmlspecialchars($currentTable); ?>">
                    <select name="format" class="export-format">
                        <option value="excel">Excel</option>
                        <option value="pdf">PDF</option>
                    </select>
                    <button type="submit" class="export-btn"><i class="fas fa-download"></i> Export</button>
                </form>
            </div>
            
            <div class="import-container">
                <form method="POST" action="" enctype="multipart/form-data">
                    <input type="hidden" name="action" value="import">
                    <input type="hidden" name="table" value="<?php echo htmlspecialchars($currentTable); ?>">
                    <input type="file" name="import_file" class="import-file" accept=".xls,.xlsx,.csv">
                    <button type="submit" class="import-btn"><i class="fas fa-upload"></i> Import</button>
                </form>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <?php foreach ($columns as $column): ?>
                        <th><?php echo htmlspecialchars($column); ?></th>
                    <?php endforeach; ?>
                    <th>Acțiuni</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($data)): ?>
                    <tr>
                        <td colspan="<?php echo count($columns) + 1; ?>" class="no-data">Nu există date disponibile</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($data as $row): ?>
                        <tr>
                            <?php foreach ($columns as $column): ?>
                                <td><?php echo htmlspecialchars($row[$column]); ?></td>
                            <?php endforeach; ?>
                            <td class="actions">
                                <button class="btn btn-edit" onclick="openEditModal('<?php echo htmlspecialchars(json_encode($row)); ?>', '<?php echo htmlspecialchars($primaryKey); ?>')"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-delete" onclick="openDeleteModal('<?php echo htmlspecialchars($row[$primaryKey]); ?>', '<?php echo htmlspecialchars($primaryKey); ?>')"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
        
        <button class="add-row" onclick="openAddModal()"><i class="fas fa-plus"></i> Adaugă rând nou</button>
        
		
		<!-- Container pentru pie chart -->
<div id="chart-container" style="display: <?php echo $currentTable === 'Pachete' ? 'block' : 'none'; ?>; margin-top: 30px;">
    <h2>Distribuția pachetelor după preț</h2>
    <div style="width: 80%; max-width: 600px; margin: 0 auto;">
        <canvas id="pachetePieChart"></canvas>
    </div>
</div>

        <!-- Modal pentru adăugare -->
        <div id="addModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeAddModal()">&times;</span>
                <h2>Adaugă rând nou</h2>
                <form method="POST" action="">
                    <input type="hidden" name="action" value="add">
                    <input type="hidden" name="table" value="<?php echo htmlspecialchars($currentTable); ?>">
                    
                    <?php foreach ($columns as $column): ?>
                        <?php if ($column !== $primaryKey): ?>
                            <div class="form-group">
                                <label for="add_<?php echo htmlspecialchars($column); ?>"><?php echo htmlspecialchars($column); ?></label>
                                <input type="text" id="add_<?php echo htmlspecialchars($column); ?>" name="<?php echo htmlspecialchars($column); ?>">
                            </div>
                        <?php endif; ?>
                    <?php endforeach; ?>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="closeAddModal()">Anulează</button>
                        <button type="submit" class="btn-save">Salvează</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Modal pentru editare -->
        <div id="editModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeEditModal()">&times;</span>
                <h2>Editează rând</h2>
                <form method="POST" action="">
                    <input type="hidden" name="action" value="edit">
                    <input type="hidden" name="table" value="<?php echo htmlspecialchars($currentTable); ?>">
                    <input type="hidden" name="primary_key" id="edit_primary_key">
                    <input type="hidden" name="primary_key_value" id="edit_primary_key_value">
                    
                    <div id="edit_form_fields">
                        <!-- Câmpurile de editare vor fi adăugate dinamic prin JavaScript -->
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="closeEditModal()">Anulează</button>
                        <button type="submit" class="btn-save">Salvează</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Modal pentru ștergere -->
        <div id="deleteModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeDeleteModal()">&times;</span>
                <h2>Șterge rând</h2>
                <p>Ești sigur că vrei să ștergi acest rând? Această acțiune nu poate fi anulată.</p>
                <form method="POST" action="">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="table" value="<?php echo htmlspecialchars($currentTable); ?>">
                    <input type="hidden" name="primary_key" id="delete_primary_key">
                    <input type="hidden" name="primary_key_value" id="delete_primary_key_value">
                    
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="closeDeleteModal()">Anulează</button>
                        <button type="submit" class="btn-save">Șterge</button>
                    </div>
                </form>
            </div>
        </div>
        
        <script>
            // Funcții pentru manipularea modalelor
            function openAddModal() {
                document.getElementById('addModal').style.display = 'block';
            }
            
            function closeAddModal() {
                document.getElementById('addModal').style.display = 'none';
            }
            
            function openEditModal(rowData, primaryKey) {
                // Parsăm datele rândului
                const row = JSON.parse(rowData);
                
                // Setăm valorile pentru cheia primară
                document.getElementById('edit_primary_key').value = primaryKey;
                document.getElementById('edit_primary_key_value').value = row[primaryKey];
                
                // Golim conținutul formularului de editare
                const formFieldsContainer = document.getElementById('edit_form_fields');
                formFieldsContainer.innerHTML = '';
                
                // Adăugăm câmpurile pentru fiecare coloană
                for (const column in row) {
                    // Creăm div-ul pentru grup de formular
                    const formGroup = document.createElement('div');
                    formGroup.className = 'form-group';
                    
                    // Creăm eticheta
                    const label = document.createElement('label');
                    label.textContent = column;
                    label.setAttribute('for', 'edit_' + column);
                    
                    // Creăm input-ul
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.id = 'edit_' + column;
                    input.name = column;
                    input.value = row[column];
                    
                    // Dacă este cheia primară, facem câmpul readonly
                    if (column === primaryKey) {
                        input.readOnly = true;
                    }
                    
                    // Adăugăm elementele la formular
                    formGroup.appendChild(label);
                    formGroup.appendChild(input);
                    formFieldsContainer.appendChild(formGroup);
                }
                
                // Afișăm modalul
                document.getElementById('editModal').style.display = 'block';
            }
            
            function closeEditModal() {
                document.getElementById('editModal').style.display = 'none';
            }
            
            function openDeleteModal(primaryKeyValue, primaryKey) {
                document.getElementById('delete_primary_key').value = primaryKey;
                document.getElementById('delete_primary_key_value').value = primaryKeyValue;
                document.getElementById('deleteModal').style.display = 'block';
            }
            
            function closeDeleteModal() {
                document.getElementById('deleteModal').style.display = 'none';
            }
            
            // Închide modalele când utilizatorul face clic în afara acestora
            window.onclick = function(event) {
                if (event.target.className === 'modal') {
                    event.target.style.display = 'none';
                }
            }
			
// Generare pie chart pentru pachete
function generatePachetePieChart() {
    // Verificăm dacă suntem pe tabela Pachete
    if ('<?php echo $currentTable; ?>' === 'Pachete') {
        // Obținem datele pentru grafic din PHP
        let pachetePrices = <?php 
            $priceRanges = [];
            if ($currentTable === 'Pachete' && !empty($data)) {
                // Definim intervalele de preț (ajustează valorile după necesități)
                $ranges = [
                    '0-1000 RON' => 0,
                    '1001-2500 RON' => 0,
                    '2501-5000 RON' => 0,
                    '5001-10000 RON' => 0,
                    '10000+ RON' => 0
                ];
                
                // Numărăm pachetele în fiecare interval de preț
                // IMPORTANT: Înlocuiește 'pret' cu numele real al coloanei de preț din tabela ta
                foreach ($data as $row) {
                    // Verifică toate coloanele posibile pentru preț
                    $priceColumn = null;
                    $possiblePriceColumns = ['Pret', 'price', 'cost', 'tarif', 'suma', 'valoare'];
                    
                    foreach ($possiblePriceColumns as $col) {
                        if (isset($row[$col])) {
                            $priceColumn = $col;
                            break;
                        }
                    }
                    
                    if ($priceColumn && is_numeric($row[$priceColumn])) {
                        $price = (float)$row[$priceColumn];
                        
                        if ($price <= 1000) {
                            $ranges['0-1000 RON']++;
                        } elseif ($price <= 2500) {
                            $ranges['1001-2500 RON']++;
                        } elseif ($price <= 5000) {
                            $ranges['2501-5000 RON']++;
                        } elseif ($price <= 10000) {
                            $ranges['5001-10000 RON']++;
                        } else {
                            $ranges['10000+ RON']++;
                        }
                    }
                }
                
                // Eliminăm intervalele fără pachete pentru un grafic mai curat
                $priceRanges = array_filter($ranges, function($count) {
                    return $count > 0;
                });
            }
            echo json_encode($priceRanges);
        ?>;
        
        // Verificăm dacă există date pentru grafic
        if (Object.keys(pachetePrices).length === 0) {
            document.getElementById('chart-container').innerHTML = 
                '<div class="no-data">Nu există date de preț disponibile pentru grafic.</div>';
            return;
        }
        
        // Pregătim datele pentru chart.js
        const labels = Object.keys(pachetePrices);
        const dataValues = Object.values(pachetePrices);
        const backgroundColors = [
            'rgba(52, 152, 219, 0.8)',   // Albastru
            'rgba(46, 204, 113, 0.8)',   // Verde
            'rgba(241, 196, 15, 0.8)',   // Galben
            'rgba(231, 76, 60, 0.8)',    // Roșu
            'rgba(155, 89, 182, 0.8)',   // Violet
            'rgba(230, 126, 34, 0.8)'    // Portocaliu
        ];
        
        // Calculăm totalul pentru procentaje
        const total = dataValues.reduce((a, b) => a + b, 0);
        
        // Generăm graficul
        const ctx = document.getElementById('pachetePieChart').getContext('2d');
        
        // Distrugem graficul existent dacă există
        if (window.pachetesChart) {
            window.pachetesChart.destroy();
        }
        
        window.pachetesChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverBorderWidth: 3,
                    hoverBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Distribuția Pachetelor după Intervale de Preț',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} pachete (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000
                }
            }
        });
        
        // Afișăm și statistici sub grafic
        displayPackageStatistics(pachetePrices, total);
    }
}

// Funcție pentru afișarea statisticilor
function displayPackageStatistics(priceRanges, total) {
    const statsContainer = document.getElementById('chart-container');
    
    let statsHTML = `
        <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #2c3e50;">Statistici Pachete:</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
    `;
    
    for (const [range, count] of Object.entries(priceRanges)) {
        const percentage = Math.round((count / total) * 100);
        statsHTML += `
            <div style="background: white; padding: 10px; border-radius: 4px; border-left: 4px solid #3498db;">
                <strong>${range}</strong><br>
                ${count} pachete (${percentage}%)
            </div>
        `;
    }
    
    statsHTML += `
            </div>
            <p style="margin-bottom: 0; margin-top: 15px; color: #7f8c8d;">
                <strong>Total pachete: ${total}</strong>
            </p>
        </div>
    `;
    
    // Adăugăm statisticile după canvas
    const canvas = document.getElementById('pachetePieChart');
    canvas.insertAdjacentHTML('afterend', statsHTML);
}

// Apelăm funcția la încărcarea paginii
document.addEventListener('DOMContentLoaded', function() {
    generatePachetePieChart();
});

// Funcție pentru actualizarea vizibilității container-ului pentru grafic
function updateChartContainerVisibility() {
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer) {
        chartContainer.style.display = '<?php echo $currentTable; ?>' === 'Pachete' ? 'block' : 'none';
    }
}

// Adăugăm event listeners pentru tab-uri
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            setTimeout(updateChartContainerVisibility, 100);
        });
    });
});

// Funcții pentru managementul istoricului SQL
function openSQLHistoryModal() {
    document.getElementById('sqlHistoryModal').style.display = 'block';
    loadSQLHistory();
}

function closeSQLHistoryModal() {
    document.getElementById('sqlHistoryModal').style.display = 'none';
}

function loadSQLHistory() {
    const limit = document.getElementById('historyLimit').value;
    const contentDiv = document.getElementById('historyContent');
    
    contentDiv.innerHTML = '<div class="loading">Se încarcă istoricul...</div>';
    
    const formData = new FormData();
    formData.append('action', 'view_sql_history');
    formData.append('history_limit', limit);
    
    fetch('', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        displaySQLHistory(data);
    })
    .catch(error => {
        contentDiv.innerHTML = '<div class="alert alert-danger">Eroare la încărcarea istoricului: ' + error.message + '</div>';
    });
}

function displaySQLHistory(history) {
    const contentDiv = document.getElementById('historyContent');
    
    if (history.length === 0) {
        contentDiv.innerHTML = '<div class="no-data">Nu există intrări în istoric.</div>';
        return;
    }
    
    let tableHTML = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>Data/Ora</th>
                    <th>Utilizator</th>
                    <th>IP</th>
                    <th>Tabel</th>
                    <th>Comandă SQL</th>
                    <th>Rezultat</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    history.forEach(entry => {
        const resultClass = entry.result.includes('Error') ? 'result-error' : 'result-success';
        
        tableHTML += `
            <tr>
                <td>${escapeHtml(entry.timestamp)}</td>
                <td>${escapeHtml(entry.user)}</td>
                <td>${escapeHtml(entry.ip)}</td>
                <td>${escapeHtml(entry.table)}</td>
                <td class="command-cell" title="${escapeHtml(entry.command)}">${escapeHtml(entry.command)}</td>
                <td class="${resultClass}">${escapeHtml(entry.result)}</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    contentDiv.innerHTML = tableHTML;
}

function clearSQLHistory() {
    if (confirm('Ești sigur că vrei să ștergi tot istoricul SQL? Această acțiune nu poate fi anulată.')) {
        // Implementează funcția pentru ștergerea istoricului
        alert('Funcția de ștergere a istoricului va fi implementată.');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
        </script>
    </div>
</body>
</html>