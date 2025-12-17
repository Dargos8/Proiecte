<?php
/**
 * database.php 
 */

class DataBase {
    private $host = "db";              // pentru Docker
    private $username = "user";        // din docker-compose
    private $password = "pass";        // din docker-compose
    private $database = "db344_proiect"; // numele corect
    private $conexiune;

    public function __construct() {
        try {
            $this->conexiune = new mysqli($this->host, $this->username, $this->password, $this->database);

            if ($this->conexiune->connect_error) {
                throw new Exception("Conexiune eșuată: " . $this->conexiune->connect_error);
            }

            $this->conexiune->set_charset("utf8");
        } catch (Exception $e) {
            error_log("Eroare de conexiune la baza de date: " . $e->getMessage());
            throw $e;
        }
    }

    public function getConexiune() {
        return $this->conexiune;
    }

    public function inchideConexiune() {
        if ($this->conexiune) {
            $this->conexiune->close();
        }
    }

    public function executaInterogare($sql) {
        try {
            $result = $this->conexiune->query($sql);
            if ($result === false) {
                throw new Exception("Eroare la executarea interogării: " . $this->conexiune->error);
            }
            return $result;
        } catch (Exception $e) {
            error_log($e->getMessage());
            throw $e;
        }
    }
}



