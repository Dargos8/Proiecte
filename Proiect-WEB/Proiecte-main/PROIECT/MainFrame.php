<?php
/**
 * MainFrame.php - Echivalentul clasei MainFrame din Java
 * Acest fișier va funcționa ca un controller principal pentru aplicația web
 */

ob_start();
session_start();

// Verificăm dacă clasa DataBase este disponibilă
require_once 'database.php'; // Adăugăm include pentru clasa DataBase

class MainFrame {
    private $conn;
    private $currentPanel;
    private $panelHistory;
    
    /**
     * Constructor - inițializează aplicația
     */
    public function __construct() {
        // Inițializează conexiunea la baza de date
        try {
            $db = new DataBase();
            $this->conn = $db->getConexiune();
        } catch (Exception $e) {
            // Gestionează eroarea de conexiune la baza de date
            error_log("Eroare de conexiune la baza de date: " . $e->getMessage());
            $this->conn = null;
        }
        
        // Inițializează istoricul panourilor (echivalent pentru Stack<String> din Java)
        if (!isset($_SESSION['panelHistory'])) {
            $_SESSION['panelHistory'] = array();
            $this->pushToHistory("Login");
        }
        $this->panelHistory = &$_SESSION['panelHistory'];
        
        // Setează panoul curent la ultimul din istoric sau la Login dacă istoricul e gol
        $this->currentPanel = !empty($this->panelHistory) ? end($this->panelHistory) : "Login";
    }
    
    /**
     * Adaugă un panou în istoric (echivalent pentru push în Stack)
     */
    private function pushToHistory($panelName) {
        if (empty($this->panelHistory) || end($this->panelHistory) !== $panelName) {
            $this->panelHistory[] = $panelName;
            $_SESSION['panelHistory'] = $this->panelHistory;
        }
    }
    
    /**
     * Schimbă panoul curent (echivalent pentru switchToPanel)
     */
    public function switchToPanel($panelName) {
        $this->pushToHistory($panelName);
        $this->currentPanel = $panelName;
        
        // În interfața web, redirecționăm către pagina corespunzătoare
        header("Location: " . $this->getPanelUrl($panelName));
        exit;
    }
    
    /**
     * Arată panoul anterior (echivalent pentru showPreviousPanel)
     */
    public function showPreviousPanel() {
        if (count($this->panelHistory) > 1) {
            // Scoate panoul curent din istoric
            array_pop($this->panelHistory);
            $_SESSION['panelHistory'] = $this->panelHistory;
            
            // Obține panoul anterior
            $previousPanel = end($this->panelHistory);
            $this->currentPanel = $previousPanel;
            
            // Redirecționează către URL-ul panoului anterior
            header("Location: " . $this->getPanelUrl($previousPanel));
            exit;
        }
    }
    
    /**
     * Returnează URL-ul corespunzător unui panou
     */
    private function getPanelUrl($panelName) {
        // Mapează numele panoului la URL-ul paginii corespunzătoare
        $panelUrls = [
            "Login" => "login.php",
            "Admin" => "admin.php",
            "User" => "user.php",
            "Destinatii" => "destinatii.php",
            "Clienti" => "clienti.php",
            "Cazari" => "cazari.php",
            "Pachete" => "pachete.php",
            "Zboruri" => "zboruri.php",
            "Rezervari" => "rezervari.php",
            "Utilizatori" => "utilizatori.php",
            "View Destinatii" => "view_destinatii.php",
            "View Zboruri" => "view_zboruri.php",
            "View Rezervari" => "view_rezervari.php",
            "View Cazari" => "view_cazari.php",
            "View Pachete" => "view_pachete.php"
        ];
        
        return isset($panelUrls[$panelName]) ? $panelUrls[$panelName] : "index.php";
    }
    
    /**
     * Returnează conexiunea la baza de date
     */
    public function getConnection() {
        return $this->conn;
    }
    
    /**
     * Returnează panoul curent
     */
    public function getCurrentPanel() {
        return $this->currentPanel;
    }
    
    /**
     * Metoda care încarcă pagina curentă (echivalent cu funcția main)
     */
    public function loadCurrentPage() {
        // În versiunea web, vom include fișierul PHP corespunzător panoului curent
        $panelFile = $this->getPanelUrl($this->currentPanel);
        
        // Verifică dacă fișierele de header și footer există
        $headerFile = 'includes/header.php';
        $footerFile = 'includes/footer.php';
        
        // Includem header-ul comun dacă există
        if (file_exists($headerFile)) {
            include_once($headerFile);
        } else {
            // Dacă nu există, afișăm un header simplu
            echo "<!DOCTYPE html>
                <html>
                <head>
                    <title>Agenție de Turism</title>
                    <meta charset='UTF-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    </style>
                </head>
                <body>";
        }
        
        // Includem fișierul paginii
        if (file_exists($panelFile)) {
            include_once($panelFile);
        } else {
            echo "<div style='padding: 20px; color: red;'>
                  <h2>Eroare: Pagina nu a fost găsită</h2>
                  <p>Fișierul '{$panelFile}' nu există.</p>
                  <p><a href='index.php'>Înapoi la pagina principală</a></p>
                  </div>";
        }
        
        // Includem footer-ul comun dacă există
        if (file_exists($footerFile)) {
            include_once($footerFile);
        } else {
            // Dacă nu există, afișăm un footer simplu
            echo "</body></html>";
        }
    }
}

// Verificăm dacă este un request direct către acest fișier
// Important: Dacă acest fișier este inclus în alte fișiere, nu executăm această parte
if (basename($_SERVER['SCRIPT_FILENAME']) == basename(__FILE__)) {
    // Activăm afișarea erorilor pentru debugging
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
    
    // Inițializăm aplicația (similar cu metoda main din Java)
    try {
        $mainFrame = new MainFrame();
        
        // Verificăm dacă există o acțiune de navigare
        if (isset($_GET['action'])) {
            $action = $_GET['action'];
            
            if ($action === 'switchPanel' && isset($_GET['panel'])) {
                $mainFrame->switchToPanel($_GET['panel']);
            } elseif ($action === 'back') {
                $mainFrame->showPreviousPanel();
            }
        }
        
        // Încărcăm pagina curentă
        $mainFrame->loadCurrentPage();
    } catch (Exception $e) {
        // Afișăm orice eroare pentru debugging
        echo "<h1>Eroare:</h1>";
        echo "<pre>" . $e->getMessage() . "</pre>";
    }

}
ob_end_flush();
