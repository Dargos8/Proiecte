<?php
/**
 * user.php - Pagina pentru utilizatori normali
 * Această pagină permite utilizatorilor să vizualizeze tabele, să efectueze căutări și filtrări,
 * să creeze rezervări și să vizualizeze grafice
 */
// Modificăm calea de salvare a sesiunii
$tmpPath = __DIR__ . '/tmp';

if (!file_exists($tmpPath)) {
    mkdir($tmpPath, 0777, true); // creează recursiv folderul cu permisiuni
}

// Setează calea folderului de sesiune la tmp local
session_save_path($tmpPath);

// Activează afișarea erorilor pentru debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Verificăm dacă este deschisă o sesiune
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verificăm dacă utilizatorul este autentificat
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    // Dacă nu este autentificat, redirecționăm către pagina de login
    header("Location: login.php");
    exit;
}

// Includem fișierul cu clasa DataBase
require_once 'database.php';

// Tabelul curent vizualizat (implicit "Destinatii")
$currentTable = isset($_GET['table']) ? $_GET['table'] : 'Destinatii';
$allowedTables = ['Destinatii', 'Cazari', 'Zboruri', 'Pachete', 'Rezervari'];

// Verificăm dacă tabelul solicitat este permis
if (!in_array($currentTable, $allowedTables)) {
    $currentTable = 'Destinatii'; // Dacă nu este permis, revenim la tabelul implicit
}

// Inițializăm conexiunea la baza de date
$dbConnection = new DataBase();
$con = $dbConnection->getConexiune();

// Mesaje pentru utilizator
$successMessage = '';
$errorMessage = '';

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
            while ($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
        }
    }
    
    return ['columns' => $columns, 'data' => $data];
}

// Funcție pentru a obține clientul conectat
function getClientConectat($con, $username) {
    $data = [];
    $query = "SELECT c.ClientID, c.Nume, c.Prenume 
              FROM Clienti c 
              JOIN Utilizatori u ON c.UtilizatorID = u.UtilizatorID 
              WHERE u.username = '$username'";
    $result = $con->query($query);
    
    if ($result && $result->num_rows > 0) {
        $data = $result->fetch_assoc();
    }
    
    return $data;
}

// Funcție pentru a obține pachete
function getPachete($con) {
    $data = [];
    $query = "SELECT PachetID, Nume, Pret FROM Pachete";
    $result = $con->query($query);
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
    }
    
    return $data;
}

// Funcție pentru a genera PDF
function generatePDF($con, $rezervareID) {
    // În loc de a genera un PDF real, simulăm conținutul acestuia
    $query = "SELECT r.RezervareID, r.DataRezervarii, r.Status, 
                     c.Nume AS ClientNume, c.Prenume AS ClientPrenume, 
                     p.Nume AS PachetNume, p.Pret AS PachetPret,
                     d.Nume AS DestinatieNume
              FROM Rezervari r
              JOIN Clienti c ON r.ClientID = c.ClientID
              JOIN Pachete p ON r.PachetID = p.PachetID
              JOIN Destinatii d ON p.DestinatieID = d.DestinatieID
              WHERE r.RezervareID = $rezervareID";
    
    $result = $con->query($query);
    
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        
        $content = "===== CHITANȚĂ REZERVARE =====\n\n";
        $content .= "Număr Rezervare: " . $row['RezervareID'] . "\n";
        $content .= "Data: " . $row['DataRezervarii'] . "\n";
        $content .= "Status: " . $row['Status'] . "\n\n";
        $content .= "Client: " . $row['ClientNume'] . " " . $row['ClientPrenume'] . "\n";
        $content .= "Pachet: " . $row['PachetNume'] . "\n";
        $content .= "Destinație: " . $row['DestinatieNume'] . "\n";
        $content .= "Preț: " . $row['PachetPret'] . " RON\n\n";
        $content .= "===========================\n";
        $content .= "Vă mulțumim pentru rezervare!\n";
        
        return $content;
    }
    
    return "Nu s-au găsit informații pentru această rezervare.";
}

// Procesează acțiunile (adăugare rezervare)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = isset($_POST['action']) ? $_POST['action'] : '';
    
if ($action === 'add_rezervare') {
    // Obținem ClientID-ul utilizatorului conectat
    $clientConectatData = getClientConectat($con, $_SESSION['username']);
    $clientID = !empty($clientConectatData) ? $clientConectatData['ClientID'] : '';
    
    $pachetID = isset($_POST['PachetID']) ? $_POST['PachetID'] : '';
    $dataRezervarii = isset($_POST['DataRezervarii']) ? $_POST['DataRezervarii'] : '';
    $status = isset($_POST['Status']) ? $_POST['Status'] : '';
    
    if (!empty($clientID) && !empty($pachetID) && !empty($dataRezervarii) && !empty($status)) {
            $query = "INSERT INTO Rezervari (ClientID, PachetID, DataRezervarii, Status) 
                      VALUES ('$clientID', '$pachetID', '$dataRezervarii', '$status')";
            
            if ($con->query($query)) {
                $rezervareID = $con->insert_id;
                $successMessage = "Rezervare adăugată cu succes! Chitanța a fost generată.";
                
                // Simulăm generarea unui PDF (în realitate, ar trebui să folosim o bibliotecă precum FPDF)
                $_SESSION['pdf_content'] = generatePDF($con, $rezervareID);
                $_SESSION['show_receipt'] = true;
            } else {
                $errorMessage = "Eroare la adăugarea rezervării: " . $con->error;
            }
        } else {
            $errorMessage = "Toate câmpurile sunt obligatorii!";
			
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

// Obținem date pentru graficul de prețuri
$chartData = [];
if ($currentTable === 'Pachete') {
    $chartQuery = "SELECT Nume, Pret FROM Pachete ORDER BY Pret";
    $chartResult = $con->query($chartQuery);
    
    if ($chartResult) {
        while ($row = $chartResult->fetch_assoc()) {
            $chartData[] = [
                'nume' => $row['Nume'],
                'pret' => $row['Pret']
            ];
        }
    }
}

// Dacă suntem pe pagina Rezervari, obținem liste de clienti și pachete pentru formularul de adăugare
$clienti = [];
$pachete = [];
if ($currentTable === 'Rezervari') {
    $clientConectat = getClientConectat($con, $_SESSION['username']);
    $pachete = getPachete($con);
}

// Închidem conexiunea (va fi redeschisă când este nevoie)
$con->close();
?>

<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Panel - Agenție Turism</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
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
            background-color: #3498db;
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
            text-decoration: none;
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
            text-decoration: none;
            color: #333;
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
        
        .no-data {
            text-align: center;
            padding: 20px;
            font-style: italic;
            color: #777;
        }
        
        .chart-container {
            margin-top: 30px;
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .add-rezervare {
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
        
        .add-rezervare i {
            margin-right: 10px;
        }
        
        .add-rezervare:hover {
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
        
        .receipt-modal {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: monospace;
            white-space: pre;
            line-height: 1.5;
            margin-top: 20px;
        }
        
        @media (max-width: 768px) {
            .search-filter-container {
                flex-direction: column;
            }
            
            .search-container, .filter-container {
                width: 100%;
                max-width: none;
            }
            
            table {
                display: block;
                overflow-x: auto;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>User Panel - Agenție Turism</h1>
            <div class="user-info">
                <span>Bine ai venit, <?php echo htmlspecialchars($_SESSION['username']); ?></span>
                <a href="logout.php" class="logout-btn">Deconectare</a>
            </div>
        </header>
        
        <?php if (isset($successMessage) && !empty($successMessage)): ?>
            <div class="alert alert-success"><?php echo $successMessage; ?></div>
        <?php endif; ?>
        
        <?php if (isset($errorMessage) && !empty($errorMessage)): ?>
            <div class="alert alert-danger"><?php echo $errorMessage; ?></div>
        <?php endif; ?>
        
        <div class="tabs">
            <a href="user.php?table=Destinatii" class="tab <?php echo $currentTable === 'Destinatii' ? 'active' : ''; ?>">Destinații</a>
            <a href="user.php?table=Cazari" class="tab <?php echo $currentTable === 'Cazari' ? 'active' : ''; ?>">Cazări</a>
            <a href="user.php?table=Zboruri" class="tab <?php echo $currentTable === 'Zboruri' ? 'active' : ''; ?>">Zboruri</a>
            <a href="user.php?table=Pachete" class="tab <?php echo $currentTable === 'Pachete' ? 'active' : ''; ?>">Pachete</a>
            <a href="user.php?table=Rezervari" class="tab <?php echo $currentTable === 'Rezervari' ? 'active' : ''; ?>">Rezervări</a>
        </div>
        
        <div class="search-filter-container">
            <form action="user.php" method="get" class="search-container">
                <input type="hidden" name="table" value="<?php echo $currentTable; ?>">
                <input type="text" name="search" placeholder="Caută..." value="<?php echo htmlspecialchars($searchTerm); ?>">
                <button type="submit" class="search-btn"><i class="fas fa-search"></i></button>
            </form>
            
            <form action="user.php" method="get" class="filter-container">
                <input type="hidden" name="table" value="<?php echo $currentTable; ?>">
                <select name="filter_column">
                    <option value="">Selectează coloană</option>
                    <?php foreach ($columns as $column): ?>
                        <option value="<?php echo $column; ?>" <?php echo $filterColumn === $column ? 'selected' : ''; ?>>
                            <?php echo $column; ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                <input type="text" name="filter_value" placeholder="Valoare filtru" value="<?php echo htmlspecialchars($filterValue); ?>">
                <button type="submit" class="filter-btn"><i class="fas fa-filter"></i> Filtrează</button>
            </form>
        </div>
        
        <table>
            <thead>
                <tr>
                    <?php foreach ($columns as $column): ?>
                        <th><?php echo $column; ?></th>
                    <?php endforeach; ?>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($data)): ?>
                    <tr>
                        <td colspan="<?php echo count($columns); ?>" class="no-data">Nu există date disponibile.</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($data as $row): ?>
                        <tr>
                            <?php foreach ($columns as $column): ?>
                                <td><?php echo htmlspecialchars($row[$column]); ?></td>
                            <?php endforeach; ?>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
        
        <?php if ($currentTable === 'Rezervari'): ?>
            <button class="add-rezervare" onclick="openRezervareModal()">
                <i class="fas fa-plus"></i> Adaugă Rezervare
            </button>
        <?php endif; ?>
        
        <?php if ($currentTable === 'Pachete' && !empty($chartData)): ?>
            <div class="chart-container">
                <h2>Grafic Prețuri Pachete</h2>
                <canvas id="priceChart"></canvas>
            </div>
            
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    const ctx = document.getElementById('priceChart').getContext('2d');
                    
                    const chartData = <?php echo json_encode($chartData); ?>;
                    const labels = chartData.map(item => item.nume);
                    const prices = chartData.map(item => item.pret);
                    
                    new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Preț (RON)',
                                data: prices,
                                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                                borderColor: 'rgba(52, 152, 219, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Preț (RON)'
                                    }
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Pachete'
                                    }
                                }
                            }
                        }
                    });
                });
            </script>
        <?php endif; ?>
        
        <!-- Modal pentru adăugare rezervare -->
        <div id="rezervareModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeRezervareModal()">&times;</span>
                <h2>Adaugă Rezervare Nouă</h2>
                <form id="rezervareForm" method="post" action="user.php?table=Rezervari">
                    <input type="hidden" name="action" value="add_rezervare">
                    
<div class="form-group">
    <label for="ClientName">Client:</label>
    <?php if (!empty($clientConectat)): ?>
        <input type="text" id="ClientName" name="ClientName" 
               value="<?php echo htmlspecialchars($clientConectat['Nume'] . ' ' . $clientConectat['Prenume']); ?>" 
               readonly style="background-color: #f8f9fa;">
    <?php else: ?>
        <input type="text" id="ClientName" name="ClientName" 
               value="Nu s-a găsit clientul asociat cu acest utilizator" 
               readonly style="background-color: #f8d7da; color: #721c24;">
    <?php endif; ?>
</div>
                    
                    <div class="form-group">
                        <label for="PachetID">Pachet:</label>
                        <select id="PachetID" name="PachetID" required>
                            <option value="">Selectează pachet</option>
                            <?php foreach ($pachete as $pachet): ?>
                                <option value="<?php echo $pachet['PachetID']; ?>">
                                    <?php echo htmlspecialchars($pachet['Nume'] . ' - ' . $pachet['Pret'] . ' RON'); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="DataRezervarii">Data Rezervării:</label>
                        <input type="date" id="DataRezervarii" name="DataRezervarii" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="Status">Status:</label>
                        <select id="Status" name="Status" required>
                            <option value="Pending">Pending</option>
                            <option value="Confirmat">Confirmat</option>
                        </select>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="closeRezervareModal()">Anulează</button>
                        <button type="submit" class="btn-save">Salvează</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Modal pentru afișarea chitanței -->
        <?php if (isset($_SESSION['show_receipt']) && $_SESSION['show_receipt']): ?>
            <div id="receiptModal" class="modal" style="display: block;">
                <div class="modal-content">
                    <span class="close" onclick="closeReceiptModal()">&times;</span>
                    <h2>Chitanță Rezervare</h2>
                    <div class="receipt-modal">
                        <?php echo $_SESSION['pdf_content']; ?>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-save" onclick="printReceipt()">Printează</button>
                        <button type="button" class="btn-cancel" onclick="closeReceiptModal()">Închide</button>
                    </div>
                </div>
            </div>
            
            <?php 
                // Resetăm flag-ul pentru a nu afișa chitanța după refresh
                $_SESSION['show_receipt'] = false;
            ?>
        <?php endif; ?>
    </div>
    
    <script>
        // Funcție pentru deschiderea modalului de rezervare
        function openRezervareModal() {
            document.getElementById('rezervareModal').style.display = 'block';
        }
        
        // Funcție pentru închiderea modalului de rezervare
        function closeRezervareModal() {
            document.getElementById('rezervareModal').style.display = 'none';
        }
        
        // Funcție pentru închiderea modalului de chitanță
        function closeReceiptModal() {
            document.getElementById('receiptModal').style.display = 'none';
        }
        
		// Funcție pentru printarea chitanței
        function printReceipt() {
            const receiptContent = document.querySelector('.receipt-modal').innerText;
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Chitanță Rezervare</title>
                    <style>
                        body {
                            font-family: monospace;
                            line-height: 1.5;
                            padding: 20px;
                        }
                    </style>
                </head>
                <body>
                    <pre>${receiptContent}</pre>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
        
        // Închide modalurile la click în afara conținutului
        window.onclick = function(event) {
            const rezervareModal = document.getElementById('rezervareModal');
            const receiptModal = document.getElementById('receiptModal');
            
            if (event.target === rezervareModal) {
                rezervareModal.style.display = 'none';
            }
            
            if (event.target === receiptModal) {
                receiptModal.style.display = 'none';
            }
        }
        
        // Setează data curentă ca valoare implicită pentru câmpul DataRezervarii
        document.addEventListener('DOMContentLoaded', function() {
            const dateInput = document.getElementById('DataRezervarii');
            if (dateInput) {
                const today = new Date();
                const year = today.getFullYear();
                let month = today.getMonth() + 1;
                let day = today.getDate();
                
                // Formatare pentru a asigura două cifre
                month = month < 10 ? '0' + month : month;
                day = day < 10 ? '0' + day : day;
                
                dateInput.value = `${year}-${month}-${day}`;
            }
        });
    </script>
</body>
</html>