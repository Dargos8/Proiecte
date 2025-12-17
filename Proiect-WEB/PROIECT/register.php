<?php
/**
 * register.php - Pagina de înregistrare a utilizatorilor noi
 * Creează automat înregistrări în tabelele Utilizatori și Clienti
 */

// Creează folderul tmp în directorul curent dacă nu există
$tmpPath = __DIR__ . '/tmp';
if (!file_exists($tmpPath)) {
    mkdir($tmpPath, 0777, true);
}

// Setează calea folderului de sesiune la acel tmp local
session_save_path($tmpPath);

// Activează afișarea erorilor pentru debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Verificăm dacă este deja deschisă o sesiune
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Includem fișierul cu clasa DataBase
require_once 'database.php';

// Variabile pentru a stoca valorile formularului și mesajele
$username = '';
$password = '';
$confirm_password = '';
$nume = '';
$prenume = '';
$email = '';
$telefon = '';
$adresa = '';
$data_nasterii = '';
$error_message = '';
$success_message = '';

// Verificăm dacă formularul a fost trimis
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Preluăm datele din formular
    $username = isset($_POST['username']) ? trim($_POST['username']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    $confirm_password = isset($_POST['confirm_password']) ? $_POST['confirm_password'] : '';
    $nume = isset($_POST['nume']) ? trim($_POST['nume']) : '';
    $prenume = isset($_POST['prenume']) ? trim($_POST['prenume']) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $telefon = isset($_POST['telefon']) ? trim($_POST['telefon']) : '';
    $adresa = isset($_POST['adresa']) ? trim($_POST['adresa']) : '';
    $data_nasterii = isset($_POST['data_nasterii']) ? $_POST['data_nasterii'] : '';
    
    // Validăm datele de intrare
    $validation_result = validateRegistrationData($username, $password, $confirm_password, $nume, $prenume, $email);
    
    if ($validation_result !== true) {
        $error_message = $validation_result;
    } else {
        // Înregistrăm utilizatorul
        $registration_result = registerUser($username, $password, $nume, $prenume, $email, $telefon, $adresa, $data_nasterii);
        
        if ($registration_result === true) {
            $success_message = "Contul a fost creat cu succes! Puteți să vă autentificați acum.";
            // Resetăm valorile formularului după înregistrarea cu succes
            $username = $password = $confirm_password = $nume = $prenume = $email = $telefon = $adresa = $data_nasterii = '';
        } else {
            $error_message = $registration_result;
        }
    }
}

/**
 * Validează datele de înregistrare
 */
function validateRegistrationData($username, $password, $confirm_password, $nume, $prenume, $email) {
    // Verificăm câmpurile obligatorii
    if (empty($username) || empty($password) || empty($confirm_password) || empty($nume) || empty($prenume) || empty($email)) {
        return "Toate câmpurile marcate cu * sunt obligatorii.";
    }
    
    // Verificăm lungimea username-ului
    if (strlen($username) < 3) {
        return "Username-ul trebuie să aibă cel puțin 3 caractere.";
    }
    
    // Verificăm lungimea parolei
    if (strlen($password) < 6) {
        return "Parola trebuie să aibă cel puțin 6 caractere.";
    }
    
    // Verificăm dacă parolele se potrivesc
    if ($password !== $confirm_password) {
        return "Parolele nu se potrivesc.";
    }
    
    // Verificăm formatul email-ului
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return "Adresa de email nu este validă.";
    }
    
    return true;
}

/**
 * Înregistrează un utilizator nou în ambele tabele
 */
function registerUser($username, $password, $nume, $prenume, $email, $telefon, $adresa, $data_nasterii) {
    try {
        $dbConnection = new DataBase();
        $con = $dbConnection->getConexiune();

        if (!$con) {
            return "Eroare la conectarea la baza de date.";
        }

        // Dezactivăm autocommit pentru a putea face tranzacție
        $con->autocommit(false);

        // Verificăm dacă username-ul există deja
        $checkUsernameQuery = "SELECT username FROM Utilizatori WHERE username = ?";
        $checkUsernameStmt = $con->prepare($checkUsernameQuery);
        if (!$checkUsernameStmt) {
            $con->rollback();
            return "Eroare la pregătirea interogării pentru username: " . $con->error;
        }
        
        $checkUsernameStmt->bind_param("s", $username);
        $checkUsernameStmt->execute();
        $usernameResult = $checkUsernameStmt->get_result();
        
        if ($usernameResult->num_rows > 0) {
            $con->rollback();
            $checkUsernameStmt->close();
            return "Username-ul există deja. Vă rugăm să alegeți altul.";
        }
        $checkUsernameStmt->close();

        // Verificăm dacă email-ul există deja
        $checkEmailQuery = "SELECT Email FROM Clienti WHERE Email = ?";
        $checkEmailStmt = $con->prepare($checkEmailQuery);
        if (!$checkEmailStmt) {
            $con->rollback();
            return "Eroare la pregătirea interogării pentru email: " . $con->error;
        }
        
        $checkEmailStmt->bind_param("s", $email);
        $checkEmailStmt->execute();
        $emailResult = $checkEmailStmt->get_result();
        
        if ($emailResult->num_rows > 0) {
            $con->rollback();
            $checkEmailStmt->close();
            return "Adresa de email există deja în sistem.";
        }
        $checkEmailStmt->close();

        // Inserăm în tabela Utilizatori (isAdmin = false pentru utilizatori normali)
        $insertUserQuery = "INSERT INTO Utilizatori (username, parola, isAdmin) VALUES (?, ?, false)";
        $insertUserStmt = $con->prepare($insertUserQuery);
        if (!$insertUserStmt) {
            $con->rollback();
            return "Eroare la pregătirea interogării pentru utilizator: " . $con->error;
        }

        $insertUserStmt->bind_param("ss", $username, $password);
        if (!$insertUserStmt->execute()) {
            $con->rollback();
            $insertUserStmt->close();
            return "Eroare la crearea utilizatorului: " . $con->error;
        }

        // Obținem ID-ul utilizatorului nou creat
        $utilizatorID = $con->insert_id;
        $insertUserStmt->close();

        // Inserăm în tabela Clienti
        $insertClientQuery = "INSERT INTO Clienti (Nume, Prenume, Email, Telefon, Adresa, DataNasterii, UtilizatorID) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $insertClientStmt = $con->prepare($insertClientQuery);
        if (!$insertClientStmt) {
            $con->rollback();
            return "Eroare la pregătirea interogării pentru client: " . $con->error;
        }

        // Tratăm data de naștere (poate fi NULL)
        $data_nasterii_param = !empty($data_nasterii) ? $data_nasterii : null;
        
        $insertClientStmt->bind_param("ssssssi", $nume, $prenume, $email, $telefon, $adresa, $data_nasterii_param, $utilizatorID);
        if (!$insertClientStmt->execute()) {
            $con->rollback();
            $insertClientStmt->close();
            return "Eroare la crearea profilului client: " . $con->error;
        }

        $insertClientStmt->close();

        // Confirmăm tranzacția
        $con->commit();
        
        return true;

    } catch (Exception $ex) {
        if (isset($con)) {
            $con->rollback();
        }
        return "Eroare la înregistrarea utilizatorului: " . $ex->getMessage();
    } finally {
        if (isset($con)) {
            $con->close();
        }
    }
}
?>

<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Înregistrare - Agenție Turism</title>
    <link rel="stylesheet" href="css/style.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px 0;
        }
        
        .register-container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            width: 500px;
            max-width: 90%;
        }
        
        .register-container h2 {
            text-align: center;
            color: #333;
            margin-bottom: 25px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        
        .required {
            color: red;
        }
        
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
            border-color: #4CAF50;
            outline: none;
        }
        
        .form-row {
            display: flex;
            gap: 15px;
        }
        
        .form-row .form-group {
            flex: 1;
        }
        
        .register-button {
            text-align: center;
            margin-top: 25px;
        }
        
        .register-button button {
            background-color: #4CAF50;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 200px;
        }
        
        .register-button button:hover {
            background-color: #45a049;
        }
        
        .error-message {
            color: red;
            text-align: center;
            margin-bottom: 15px;
            padding: 10px;
            background-color: #ffe6e6;
            border: 1px solid #ff9999;
            border-radius: 4px;
        }
        
        .success-message {
            color: green;
            text-align: center;
            margin-bottom: 15px;
            padding: 10px;
            background-color: #e6ffe6;
            border: 1px solid #99ff99;
            border-radius: 4px;
        }
        
        .login-link {
            text-align: center;
            margin-top: 20px;
        }
        
        .login-link a {
            color: #4CAF50;
            text-decoration: none;
        }
        
        .login-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="register-container">
        <h2>Înregistrare Cont Nou</h2>
        
        <?php if (!empty($error_message)): ?>
            <div class="error-message"><?php echo htmlspecialchars($error_message); ?></div>
        <?php endif; ?>
        
        <?php if (!empty($success_message)): ?>
            <div class="success-message"><?php echo htmlspecialchars($success_message); ?></div>
        <?php endif; ?>
        
        <form method="post" action="<?php echo htmlspecialchars($_SERVER['PHP_SELF']); ?>">
            <!-- Informații de autentificare -->
            <div class="form-group">
                <label for="username">Username <span class="required">*</span>:</label>
                <input type="text" id="username" name="username" value="<?php echo htmlspecialchars($username); ?>" required>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="password">Parolă <span class="required">*</span>:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                
                <div class="form-group">
                    <label for="confirm_password">Confirmare Parolă <span class="required">*</span>:</label>
                    <input type="password" id="confirm_password" name="confirm_password" required>
                </div>
            </div>
            
            <!-- Informații personale -->
            <div class="form-row">
                <div class="form-group">
                    <label for="nume">Nume <span class="required">*</span>:</label>
                    <input type="text" id="nume" name="nume" value="<?php echo htmlspecialchars($nume); ?>" required>
                </div>
                
                <div class="form-group">
                    <label for="prenume">Prenume <span class="required">*</span>:</label>
                    <input type="text" id="prenume" name="prenume" value="<?php echo htmlspecialchars($prenume); ?>" required>
                </div>
            </div>
            
            <div class="form-group">
                <label for="email">Email <span class="required">*</span>:</label>
                <input type="email" id="email" name="email" value="<?php echo htmlspecialchars($email); ?>" required>
            </div>
            
            <div class="form-group">
                <label for="telefon">Telefon:</label>
                <input type="tel" id="telefon" name="telefon" value="<?php echo htmlspecialchars($telefon); ?>">
            </div>
            
            <div class="form-group">
                <label for="adresa">Adresă:</label>
                <textarea id="adresa" name="adresa" rows="3"><?php echo htmlspecialchars($adresa); ?></textarea>
            </div>
            
            <div class="form-group">
                <label for="data_nasterii">Data Nașterii:</label>
                <input type="date" id="data_nasterii" name="data_nasterii" value="<?php echo htmlspecialchars($data_nasterii); ?>">
            </div>
            
            <div class="register-button">
                <button type="submit">Înregistrează-te</button>
            </div>
        </form>
        
        <div class="login-link">
            <p>Ai deja un cont? <a href="login.php">Autentifică-te aici</a></p>
        </div>
    </div>
</body>
</html>