<?php
/**
 * login.php - Echivalentul clasei LoginPanel din Java
 * Această pagină gestionează procesul de autentificare a utilizatorului
 */

// Verificăm dacă este deja deschisă o sesiune
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once 'MainFrame.php';
$mainFrame = new MainFrame();
// Includem fișierul cu clasa DataBase
require_once 'database.php';

// Variabile pentru a stoca valorile formularului și mesajele de eroare
$username = '';
$password = '';
$error_message = '';
$userType = 'user';

// Verificăm dacă formularul a fost trimis
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Preluăm datele din formular
    $username = isset($_POST['username']) ? trim($_POST['username']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    
    // Validăm datele de intrare
    if (empty($username) || empty($password)) {
        $error_message = "Vă rugăm să introduceți atât numele de utilizator cât și parola.";
    } else {
        // Verificăm credențialele în baza de date
        $result = verifyCredentials($username, $password);

        if (is_array($result) && $result['success'] === true) {
            $userType = $result['userType'];
            
            // Curățăm sesiunea existentă și setăm noile valori
            session_unset();
            
            $_SESSION['username'] = $username;
            $_SESSION['userType'] = $userType;
            $_SESSION['logged_in'] = true;

          if ($userType === 'admin') {
    $_SESSION['login_message'] = "Autentificat ca admin: " . $username;
    $mainFrame->switchToPanel("Admin");  // în loc de header("Location: admin.php");
    exit;
} else {
    $_SESSION['login_message'] = "Autentificat ca user: " . $username;
    $mainFrame->switchToPanel("User");   // în loc de header("Location: user.php");
    exit;
}

        } else {
            $error_message = is_string($result) ? $result : "Credențiale invalide. Vă rugăm să încercați din nou.";
        }
    }
}

/**
 * Verifică credențialele utilizatorului în baza de date
 * Echivalent cu metoda verifyCredentials din clasa LoginAction
 * @return array cu success și userType dacă autentificarea a reușit, mesaj de eroare în caz contrar
 */
function verifyCredentials($username, $password) {
    try {
        $dbConnection = new DataBase();
        $con = $dbConnection->getConexiune();

        if (!$con) {
            return "Eroare la conectarea la baza de date.";
        }

        $query = "SELECT * FROM Utilizatori WHERE username = ?";
        $preparedStatement = $con->prepare($query);
        if (!$preparedStatement) {
            return "Eroare la pregătirea interogării: " . $con->error;
        }

        $preparedStatement->bind_param("s", $username);
        $preparedStatement->execute();
        $result = $preparedStatement->get_result();

        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $storedPassword = $row['parola'];
            $isAdmin = $row['isAdmin'];

            if ($password === $storedPassword) {
                $userType = $isAdmin ? 'admin' : 'user';
                
                return [
                    'success' => true,
                    'userType' => $userType
                ];
            } else {
                return "Parolă incorectă.";
            }
        } else {
            return "Numele de utilizator nu există.";
        }
    } catch (Exception $ex) {
        return "Eroare la verificarea credențialelor: " . $ex->getMessage();
    } finally {
        if (isset($preparedStatement)) $preparedStatement->close();
        if (isset($con)) $con->close();
    }
}
?>

<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Autentificare - Agenție Turism</title>
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
            height: 100vh;
        }
        
        .login-container {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            width: 450px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: inline-block;
            width: 220px;
            text-align: center;
            margin-right: 5px;
        }
        
        .form-group input {
            display: inline-block;
            width: 215px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .login-button {
            text-align: center;
            margin-top: 20px;
        }
        
        .login-button button {
            background-color: #4CAF50;
            color: black;
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 225px;
        }
        
        .error-message {
            color: red;
            text-align: center;
            margin-top: 10px;
        }
        
        .register-link {
            text-align: center;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
        }
        
        .register-link p {
            margin: 0;
            color: #666;
            font-size: 14px;
        }
        
        .register-link a {
            color: #4CAF50;
            text-decoration: none;
            font-weight: bold;
        }
        
        .register-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <?php if (!empty($error_message)): ?>
            <div class="error-message"><?php echo $error_message; ?></div>
        <?php endif; ?>
        
        <form method="post" action="<?php echo htmlspecialchars($_SERVER['PHP_SELF']); ?>">
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" value="<?php echo htmlspecialchars($username); ?>">
            </div>
            
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password">
            </div>
            
            <div class="login-button">
                <button type="submit">Login</button>
            </div>
        </form>
        
        <div class="register-link">
            <p>Nu ai un cont? <a href="register.php">Înregistrează-te aici</a></p>
        </div>
    </div>
</body>
</html>

