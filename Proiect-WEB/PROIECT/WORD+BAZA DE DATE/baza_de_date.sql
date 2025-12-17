-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: db344.cti.ugal.ro    Database: db344_proiect
-- ------------------------------------------------------
-- Server version	8.0.42-0ubuntu0.20.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Cazari`
--

DROP TABLE IF EXISTS `Cazari`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Cazari` (
  `CazareID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `NumeHotel` varchar(100) NOT NULL,
  `Adresa` varchar(200) NOT NULL,
  `CheckIn` date NOT NULL,
  `CheckOut` date NOT NULL,
  `PachetID` bigint unsigned NOT NULL,
  PRIMARY KEY (`CazareID`),
  KEY `PachetID` (`PachetID`),
  CONSTRAINT `Cazari_ibfk_1` FOREIGN KEY (`PachetID`) REFERENCES `Pachete` (`PachetID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Cazari`
--

LOCK TABLES `Cazari` WRITE;
/*!40000 ALTER TABLE `Cazari` DISABLE KEYS */;
INSERT INTO `Cazari` VALUES (1,'Sol Don Pablo','Paseo Maritimo 12, Torremolinos, Malaga, Spania','2025-07-15','2025-07-22',1),(3,'Villa La Massa','Via della Massa 24, Florența, Italia','2025-09-05','2025-09-15',3),(4,'Katikies Hotel','Oia, Santorini, Grecia','2025-08-20','2025-08-26',4),(5,'Mont Cervin Palace','Bahnhofstrasse 31, Zermatt, Elveția','2026-01-10','2026-01-17',5),(6,'Tabacon Thermal Resort','La Fortuna, Arenal Volcano, Costa Rica','2025-11-03','2025-11-17',6),(7,'Four Seasons Resort Bali','Jimbaran Bay, Bali, Indonezia','2025-10-12','2025-10-22',7),(8,'The Plaza','Fifth Avenue 768, New York, SUA','2025-05-15','2025-05-19',8),(9,'Park Hyatt Tokyo','Shinjuku Park Tower, Tokyo, Japonia','2025-09-25','2025-10-02',9),(10,'Fairmont Mara Safari Club','Masai Mara Game Reserve, Kenya','2025-08-05','2025-08-13',10);
/*!40000 ALTER TABLE `Cazari` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Clienti`
--

DROP TABLE IF EXISTS `Clienti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Clienti` (
  `ClientID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `Nume` varchar(50) NOT NULL,
  `Prenume` varchar(50) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `Telefon` varchar(15) DEFAULT NULL,
  `Adresa` varchar(200) DEFAULT NULL,
  `DataNasterii` date DEFAULT NULL,
  `UtilizatorID` bigint unsigned NOT NULL,
  PRIMARY KEY (`ClientID`),
  UNIQUE KEY `Email` (`Email`),
  KEY `UtilizatorID` (`UtilizatorID`),
  CONSTRAINT `Clienti_ibfk_1` FOREIGN KEY (`UtilizatorID`) REFERENCES `Utilizatori` (`UtilizatorID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Clienti`
--

LOCK TABLES `Clienti` WRITE;
/*!40000 ALTER TABLE `Clienti` DISABLE KEYS */;
INSERT INTO `Clienti` VALUES (2,'Ionescu','Maria','maria.ionescu@email.com','0733234567','Bd. Libertății nr. 10, Cluj','1990-07-22',3),(7,'Popa','Mihai','mihai.popa@email.com','0788789012','Str. Ștefan cel Mare nr. 8, Galați','1980-04-10',8),(8,'Dobre','Cristina','cristina.dobre@email.com','0799890123','Aleea Parcului nr. 3, Craiova','1993-08-12',9),(11,'Dragos','Barbu','dragos420@yahoo.com','0755555555','strada','2003-10-14',15),(12,'Dragos','D','dragos421@yahoo.com','07','adrt',NULL,16);
/*!40000 ALTER TABLE `Clienti` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Destinatii`
--

DROP TABLE IF EXISTS `Destinatii`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Destinatii` (
  `DestinatieID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `Nume` varchar(100) NOT NULL,
  `Tara` varchar(50) NOT NULL,
  `Oras` varchar(50) NOT NULL,
  `Descriere` text,
  PRIMARY KEY (`DestinatieID`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Destinatii`
--

LOCK TABLES `Destinatii` WRITE;
/*!40000 ALTER TABLE `Destinatii` DISABLE KEYS */;
INSERT INTO `Destinatii` VALUES (1,'Costa del sol','spania','malaga','descriere'),(2,'Riviera Franceză','Franța','Nisa','Una dintre cele mai celebre zone de coastă din lume, cu stațiuni luxoase, plaje superbe și o atmosferă sofisticată.'),(3,'Toscana','Italia','Florența','Regiune renumită pentru peisajele sale pitorești, vinurile excelente și moștenirea artistică și culturală.'),(4,'Santorini','Grecia','Thira','Insulă vulcanică din Marea Egee, cu peisaje spectaculoase, sate albe și apusuri de soare impresionante.'),(5,'Alpi Elvețieni','Elveția','Zermatt','Stațiune montană renumită, situată la poalele muntelui Matterhorn, oferind unele dintre cele mai bune pârtii de schi din lume.'),(6,'Costa Rica','Costa Rica','San Jose','Destinație tropicală cu plaje minunate, păduri tropicale bogate și o biodiversitate impresionantă.'),(7,'Bali','Indonezia','Denpasar','Insulă paradisiacă cu plaje superbe, temple antice și o cultură vibrantă.'),(8,'New York','SUA','New York','Metropolă cosmopolită, centru al artei, modei, gastronomiei și culturii americane.'),(9,'Tokyo','Japonia','Tokyo','Unul dintre cele mai mari orașe ale lumii, combinând tradiția japoneză cu tehnologia modernă.'),(10,'Safari Kenya','Kenya','Nairobi','Experiență autentică de safari, oferind posibilitatea de a observa \"Big Five\" în habitatul lor natural.');
/*!40000 ALTER TABLE `Destinatii` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Pachete`
--

DROP TABLE IF EXISTS `Pachete`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Pachete` (
  `PachetID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `Nume` varchar(100) NOT NULL,
  `DestinatieID` bigint unsigned NOT NULL,
  `Descriere` text,
  `Pret` decimal(10,2) NOT NULL,
  `DataInceput` date NOT NULL,
  `DataSfarsit` date NOT NULL,
  PRIMARY KEY (`PachetID`),
  KEY `DestinatieID` (`DestinatieID`),
  CONSTRAINT `Pachete_ibfk_1` FOREIGN KEY (`DestinatieID`) REFERENCES `Destinatii` (`DestinatieID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Pachete`
--

LOCK TABLES `Pachete` WRITE;
/*!40000 ALTER TABLE `Pachete` DISABLE KEYS */;
INSERT INTO `Pachete` VALUES (1,'Vacanță de vară în Spania',1,'O săptămână pe plajele însorite din Costa del Sol, inclusiv excursii la Alhambra și Gibraltar.',1200.00,'2025-07-15','2025-07-22'),(3,'Descoperă Toscana',3,'Circuit de 10 zile prin cele mai pitorești orașe din Toscana, cu degustări de vinuri și cursuri de gătit.',1800.00,'2025-09-05','2025-09-15'),(4,'Relaxare în Santorini',4,'Sejur de 6 nopți într-un hotel boutique cu piscină infinită, cu vedere la Caldera.',1500.00,'2025-08-20','2025-08-26'),(5,'Aventură de iarnă în Alpi',5,'O săptămână de schi și sporturi de iarnă în stațiunea Zermatt, cu instructori profesioniști.',2200.00,'2026-01-10','2026-01-17'),(6,'Escapadă tropicală în Costa Rica',6,'Două săptămâni de explorare a junglei, plajelor și vulcanilor din Costa Rica, cu activități de aventură.',2500.00,'2025-11-03','2025-11-17'),(7,'Paradisul din Bali',7,'Zece zile de relaxare în Bali, cu tratamente spa, lecții de yoga și excursii la temple.',1700.00,'2025-10-12','2025-10-22'),(8,'City break la New York',8,'Patru zile intense în Marele Măr, cu vizite la cele mai importante obiective turistice și un spectacol pe Broadway.',1300.00,'2025-05-15','2025-05-19'),(9,'Experiența Tokyo',9,'O săptămână de imersiune în cultura japoneză, tehnologie de ultimă oră și gastronomie unică.',2100.00,'2025-09-25','2025-10-02'),(10,'Safari african',10,'Safari de lux de 8 zile în Kenya, cu cazare în lodgeuri de 5 stele și ghizi experimentați.',3200.00,'2025-08-05','2025-08-13'),(11,'nume',3,'da',2000.00,'2025-01-01','2025-02-02');
/*!40000 ALTER TABLE `Pachete` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Rezervari`
--

DROP TABLE IF EXISTS `Rezervari`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Rezervari` (
  `RezervareID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ClientID` bigint unsigned NOT NULL,
  `PachetID` bigint unsigned NOT NULL,
  `DataRezervarii` date NOT NULL,
  `Status` varchar(20) NOT NULL,
  PRIMARY KEY (`RezervareID`),
  KEY `ClientID` (`ClientID`),
  KEY `PachetID` (`PachetID`),
  CONSTRAINT `Rezervari_ibfk_1` FOREIGN KEY (`ClientID`) REFERENCES `Clienti` (`ClientID`) ON DELETE CASCADE,
  CONSTRAINT `Rezervari_ibfk_2` FOREIGN KEY (`PachetID`) REFERENCES `Pachete` (`PachetID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Rezervari`
--

LOCK TABLES `Rezervari` WRITE;
/*!40000 ALTER TABLE `Rezervari` DISABLE KEYS */;
INSERT INTO `Rezervari` VALUES (2,2,5,'2025-02-15','Confirmată'),(7,7,10,'2025-04-02','Confirmată'),(8,8,4,'2025-04-10','În așteptare'),(11,2,3,'2025-05-01','În așteptare'),(14,11,1,'2025-05-22','confirmat'),(15,11,1,'2025-05-22','confirmat'),(18,2,3,'2025-05-26','pending'),(20,2,3,'2025-05-26','confirmat');
/*!40000 ALTER TABLE `Rezervari` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Utilizatori`
--

DROP TABLE IF EXISTS `Utilizatori`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Utilizatori` (
  `UtilizatorID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(200) NOT NULL,
  `parola` varchar(200) NOT NULL,
  `isAdmin` tinyint(1) NOT NULL,
  PRIMARY KEY (`UtilizatorID`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Utilizatori`
--

LOCK TABLES `Utilizatori` WRITE;
/*!40000 ALTER TABLE `Utilizatori` DISABLE KEYS */;
INSERT INTO `Utilizatori` VALUES (1,'admin','parola123',1),(2,'ion.popescu','parola456',0),(3,'maria.ionescu','parola789',0),(4,'alex.dumitrescu','parolaABC',0),(5,'elena.vasilescu','parolaDEF',0),(6,'george.stan','parolaGHI',0),(7,'ana.marinescu','parolaJKL',0),(8,'mihai.popa','parolaMNO',0),(9,'cristina.dobre','parolaPQR',0),(10,'andrei.preda','parolaSTU',0),(11,'user','parola',0),(12,'user2','parola2',0),(15,'Dragos','parola',0),(16,'Ddd','parola',0);
/*!40000 ALTER TABLE `Utilizatori` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Zboruri`
--

DROP TABLE IF EXISTS `Zboruri`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Zboruri` (
  `ZborID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `NumarZbor` varchar(10) NOT NULL,
  `CompanieAeriana` varchar(50) NOT NULL,
  `DataPlecare` timestamp NOT NULL,
  `DataSosire` timestamp NOT NULL,
  `AeroportPlecare` varchar(50) NOT NULL,
  `AeroportSosire` varchar(50) NOT NULL,
  `PachetID` bigint unsigned NOT NULL,
  PRIMARY KEY (`ZborID`),
  KEY `PachetID` (`PachetID`),
  CONSTRAINT `Zboruri_ibfk_1` FOREIGN KEY (`PachetID`) REFERENCES `Pachete` (`PachetID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Zboruri`
--

LOCK TABLES `Zboruri` WRITE;
/*!40000 ALTER TABLE `Zboruri` DISABLE KEYS */;
INSERT INTO `Zboruri` VALUES (1,'RO1234','TAROM','2025-07-15 05:30:00','2025-07-15 08:15:00','Aeroportul Henri Coandă, București','Aeroportul Malaga-Costa del Sol',1),(3,'AZ9012','Alitalia','2025-09-05 04:20:00','2025-09-05 05:55:00','Aeroportul Henri Coandă, București','Aeroportul Florența-Peretola',3),(4,'A31234','Aegean Airlines','2025-08-20 03:30:00','2025-08-20 07:15:00','Aeroportul Henri Coandă, București','Aeroportul Santorini (Thira)',4),(5,'LX5678','SWISS','2026-01-10 07:15:00','2026-01-10 09:00:00','Aeroportul Henri Coandă, București','Aeroportul Zurich',5),(6,'IB9012','Iberia','2025-11-03 09:30:00','2025-11-03 20:45:00','Aeroportul Henri Coandă, București','Aeroportul Internațional Juan Santamaría',6),(7,'SQ3456','Singapore Airlines','2025-10-12 19:15:00','2025-10-13 15:30:00','Aeroportul Henri Coandă, București','Aeroportul Internațional Ngurah Rai',7),(8,'DL7890','Delta Airlines','2025-05-15 09:45:00','2025-05-15 14:30:00','Aeroportul Henri Coandă, București','Aeroportul JFK, New York',8),(9,'NH1234','All Nippon Airways','2025-09-25 11:10:00','2025-09-26 07:35:00','Aeroportul Henri Coandă, București','Aeroportul Internațional Tokyo Haneda',9),(10,'KQ5678','Kenya Airways','2025-08-04 22:25:00','2025-08-05 09:40:00','Aeroportul Henri Coandă, București','Aeroportul Internațional Jomo Kenyatta',10);
/*!40000 ALTER TABLE `Zboruri` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-26 18:25:05
