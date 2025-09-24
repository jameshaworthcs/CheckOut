-- MySQL dump 10.13  Distrib 8.0.42, for Linux (aarch64)
--
-- Host: localhost    Database: checkout_dev
-- ------------------------------------------------------
-- Server version	8.0.42-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Courses`
--

DROP TABLE IF EXISTS `Courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Courses` (
  `course_id` int NOT NULL AUTO_INCREMENT,
  `institution_id` varchar(50) DEFAULT NULL,
  `year_id` int DEFAULT NULL,
  `course_code` varchar(50) DEFAULT NULL,
  `course_name` varchar(255) DEFAULT NULL,
  `tibl` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`course_id`),
  KEY `institution_id` (`institution_id`),
  KEY `year_id` (`year_id`),
  CONSTRAINT `Courses_ibfk_1` FOREIGN KEY (`institution_id`) REFERENCES `Institutions` (`institution_id`),
  CONSTRAINT `Courses_ibfk_2` FOREIGN KEY (`year_id`) REFERENCES `Years` (`year_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Institutions`
--

DROP TABLE IF EXISTS `Institutions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Institutions` (
  `institution_id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`institution_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Modules`
--

DROP TABLE IF EXISTS `Modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Modules` (
  `module_id` int NOT NULL AUTO_INCREMENT,
  `institution_id` varchar(50) DEFAULT NULL,
  `year_id` int DEFAULT NULL,
  `course_id` int DEFAULT NULL,
  `module_code` varchar(50) DEFAULT NULL,
  `module_name` varchar(255) DEFAULT NULL,
  `module_tibl_code` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`module_id`),
  UNIQUE KEY `institution_id` (`institution_id`,`year_id`,`course_id`,`module_code`),
  KEY `year_id` (`year_id`),
  KEY `course_id` (`course_id`),
  CONSTRAINT `Modules_ibfk_1` FOREIGN KEY (`institution_id`) REFERENCES `Institutions` (`institution_id`),
  CONSTRAINT `Modules_ibfk_2` FOREIGN KEY (`year_id`) REFERENCES `Years` (`year_id`),
  CONSTRAINT `Modules_ibfk_3` FOREIGN KEY (`course_id`) REFERENCES `Courses` (`course_id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TimetableSessions`
--

DROP TABLE IF EXISTS `TimetableSessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TimetableSessions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activityID` int NOT NULL,
  `activity_reference` varchar(500) DEFAULT NULL,
  `module_tibl_code` varchar(255) DEFAULT NULL,
  `start_day` varchar(50) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `duration` varchar(50) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `staff` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `size` int DEFAULT NULL,
  `module_description` varchar(255) DEFAULT NULL,
  `weekly_pattern` varchar(255) DEFAULT NULL,
  `online_location` varchar(50) DEFAULT NULL,
  `online_session_details` varchar(255) DEFAULT NULL,
  `notes` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ts_time` (`start_date`,`start_time`),
  KEY `idx_ts_module` (`module_tibl_code`),
  KEY `idx_ts_time_module` (`start_date`,`start_time`,`module_tibl_code`),
  KEY `idx_ts_activity` (`activityID`)
) ENGINE=InnoDB AUTO_INCREMENT=805 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Years`
--

DROP TABLE IF EXISTS `Years`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Years` (
  `year_id` int NOT NULL AUTO_INCREMENT,
  `institution_id` varchar(50) DEFAULT NULL,
  `year_number` int DEFAULT NULL,
  PRIMARY KEY (`year_id`),
  KEY `institution_id` (`institution_id`),
  CONSTRAINT `Years_ibfk_1` FOREIGN KEY (`institution_id`) REFERENCES `Institutions` (`institution_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `appeals`
--

DROP TABLE IF EXISTS `appeals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appeals` (
  `ip` varchar(255) DEFAULT NULL,
  `appeal_text` varchar(1000) DEFAULT NULL,
  `status` varchar(200) DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `autoCheckinLog`
--

DROP TABLE IF EXISTS `autoCheckinLog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `autoCheckinLog` (
  `logID` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `message` varchar(1000) DEFAULT NULL,
  `timestamp` datetime DEFAULT NULL,
  PRIMARY KEY (`logID`)
) ENGINE=InnoDB AUTO_INCREMENT=62684 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `banned_ips`
--

DROP TABLE IF EXISTS `banned_ips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `banned_ips` (
  `ip` varchar(255) DEFAULT NULL,
  `reason` varchar(1000) DEFAULT NULL,
  `ban_expiry` varchar(300) DEFAULT NULL,
  `routes` json DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `codes`
--

DROP TABLE IF EXISTS `codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `codes` (
  `codeID` int NOT NULL AUTO_INCREMENT,
  `inst` varchar(200) NOT NULL,
  `crs` varchar(200) NOT NULL,
  `yr` varchar(200) NOT NULL,
  `md` varchar(30) NOT NULL,
  `codeDay` varchar(20) NOT NULL,
  `groupCode` varchar(20) NOT NULL,
  `checkinCode` int NOT NULL,
  `timestamp` varchar(30) DEFAULT NULL,
  `ip` varchar(50) DEFAULT NULL,
  `useragent` varchar(1000) DEFAULT NULL,
  `tk` varchar(255) DEFAULT NULL,
  `deviceID` varchar(50) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `codeState` varchar(1) DEFAULT NULL,
  `codeDesc` varchar(255) DEFAULT NULL,
  `codeReps` varchar(50) DEFAULT NULL,
  `visState` varchar(1) DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `verifiedInfo` json DEFAULT NULL,
  PRIMARY KEY (`codeID`)
) ENGINE=InnoDB AUTO_INCREMENT=8270 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `globalapp`
--

DROP TABLE IF EXISTS `globalapp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `globalapp` (
  `iosState` int NOT NULL DEFAULT '1',
  `androidState` int NOT NULL DEFAULT '1',
  `iosMessage` varchar(500) DEFAULT NULL,
  `iosMsgLink` varchar(500) DEFAULT NULL,
  `androidMessage` varchar(500) DEFAULT NULL,
  `androidMsgLink` varchar(500) DEFAULT NULL,
  `moduleCodes` varchar(500) DEFAULT NULL,
  `yearCodes` varchar(500) DEFAULT NULL,
  `siteCodes` varchar(500) DEFAULT NULL,
  `defaultSiteCode` varchar(50) DEFAULT NULL,
  `forceSiteCode` int DEFAULT NULL,
  `revID` int NOT NULL AUTO_INCREMENT,
  `webState` int DEFAULT NULL,
  `boycottState` int DEFAULT NULL,
  `boycottMsg` varchar(500) DEFAULT NULL,
  `boycottLink` varchar(500) DEFAULT NULL,
  `rootDomain` varchar(200) DEFAULT NULL,
  `passWord` varchar(300) DEFAULT NULL,
  `undoState` int DEFAULT NULL,
  `authState` int DEFAULT NULL,
  `rateLimit` varchar(50) DEFAULT NULL,
  `bedtimeState` int DEFAULT NULL,
  `dayStart` varchar(20) DEFAULT NULL,
  `dayEnd` varchar(20) DEFAULT NULL,
  `webStateMsg` varchar(500) DEFAULT NULL,
  `webStateLink` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`revID`)
) ENGINE=InnoDB AUTO_INCREMENT=175 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hcil`
--

DROP TABLE IF EXISTS `hcil`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hcil` (
  `codeDay` varchar(20) NOT NULL,
  `groupCode` varchar(20) DEFAULT 'n/a',
  `checkinCode` int NOT NULL,
  `timestamp` varchar(30) NOT NULL,
  `ip` varchar(50) NOT NULL,
  `useragent` varchar(1000) NOT NULL,
  `tk` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hcip`
--

DROP TABLE IF EXISTS `hcip`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hcip` (
  `codeDay` varchar(20) NOT NULL,
  `groupCode` varchar(20) DEFAULT 'n/a',
  `checkinCode` int NOT NULL,
  `timestamp` varchar(30) NOT NULL,
  `ip` varchar(50) NOT NULL,
  `useragent` varchar(1000) NOT NULL,
  `tk` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `perms`
--

DROP TABLE IF EXISTS `perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `perms` (
  `userstate` varchar(255) DEFAULT NULL,
  `routes` json DEFAULT NULL,
  `permid` int NOT NULL AUTO_INCREMENT,
  `ratelimit` int DEFAULT NULL,
  PRIMARY KEY (`permid`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `request_log`
--

DROP TABLE IF EXISTS `request_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL,
  `ip` varchar(45) NOT NULL,
  `spoofed_ip` varchar(45) DEFAULT NULL,
  `host` varchar(255) NOT NULL,
  `method` varchar(10) NOT NULL,
  `path` text,
  `username` varchar(255) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `user_agent` text NOT NULL,
  `referer` text,
  `post_data` text,
  `device_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=778193 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sessions_old`
--

DROP TABLE IF EXISTS `sessions_old`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions_old` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `snaplog`
--

DROP TABLE IF EXISTS `snaplog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `snaplog` (
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ip` varchar(225) DEFAULT NULL,
  `useragent` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `soft1`
--

DROP TABLE IF EXISTS `soft1`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `soft1` (
  `codeDay` varchar(20) NOT NULL,
  `groupCode` varchar(20) DEFAULT 'n/a',
  `checkinCode` int NOT NULL,
  `timestamp` varchar(30) NOT NULL,
  `ip` varchar(50) NOT NULL,
  `useragent` varchar(1000) NOT NULL,
  `tk` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `support_requests`
--

DROP TABLE IF EXISTS `support_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `form_data` json NOT NULL,
  `notes` text,
  `completed` tinyint(1) DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_completed` (`completed`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `theory1`
--

DROP TABLE IF EXISTS `theory1`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `theory1` (
  `codeDay` varchar(20) NOT NULL,
  `groupCode` varchar(20) DEFAULT 'n/a',
  `checkinCode` int NOT NULL,
  `timestamp` varchar(30) NOT NULL,
  `ip` varchar(50) NOT NULL,
  `useragent` varchar(1000) NOT NULL,
  `tk` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transition`
--

DROP TABLE IF EXISTS `transition`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transition` (
  `codeDay` varchar(20) NOT NULL,
  `groupCode` varchar(20) DEFAULT 'n/a',
  `checkinCode` int NOT NULL,
  `timestamp` varchar(30) NOT NULL,
  `ip` varchar(50) NOT NULL,
  `useragent` varchar(1000) NOT NULL,
  `tk` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `code` varchar(6) DEFAULT NULL,
  `api_token` varchar(255) DEFAULT NULL,
  `userstate` varchar(255) DEFAULT NULL,
  `checkintoken` varchar(1000) DEFAULT NULL,
  `checkinstate` int DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL,
  `note` varchar(1000) DEFAULT NULL,
  `fullName` varchar(200) DEFAULT NULL,
  `checkinReport` varchar(1000) DEFAULT NULL,
  `checkinReportTime` datetime DEFAULT NULL,
  `accountCreationTime` datetime DEFAULT NULL,
  `sync` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2004 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `y1-sd`
--

DROP TABLE IF EXISTS `y1-sd`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `y1-sd` (
  `codeDay` varchar(20) NOT NULL,
  `groupCode` varchar(20) DEFAULT 'n/a',
  `checkinCode` int NOT NULL,
  `timestamp` varchar(30) NOT NULL,
  `ip` varchar(50) NOT NULL,
  `useragent` varchar(1000) NOT NULL,
  `tk` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `y1-soft-2`
--

DROP TABLE IF EXISTS `y1-soft-2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `y1-soft-2` (
  `codeDay` varchar(20) NOT NULL,
  `groupCode` varchar(20) DEFAULT 'n/a',
  `checkinCode` int NOT NULL,
  `timestamp` varchar(30) NOT NULL,
  `ip` varchar(50) NOT NULL,
  `useragent` varchar(1000) NOT NULL,
  `tk` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `y1-theory-2`
--

DROP TABLE IF EXISTS `y1-theory-2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `y1-theory-2` (
  `codeDay` varchar(20) NOT NULL,
  `groupCode` varchar(20) DEFAULT 'n/a',
  `checkinCode` int NOT NULL,
  `timestamp` varchar(30) NOT NULL,
  `ip` varchar(50) NOT NULL,
  `useragent` varchar(1000) NOT NULL,
  `tk` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-24 20:58:00
-- MySQL dump 10.13  Distrib 8.0.42, for Linux (aarch64)
--
-- Host: localhost    Database: checkout_dev
-- ------------------------------------------------------
-- Server version	8.0.42-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2003,'local@checkout.ac.uk',NULL,'local','sysop','',0,'Local','','local','Disabled','2025-02-14 03:28:50','2024-11-20 23:37:26','{\"yr\": \"0\", \"crs\": \"test_course\", \"inst\": \"test\"}');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-24 20:58:00
-- MySQL dump 10.13  Distrib 8.0.42, for Linux (aarch64)
--
-- Host: localhost    Database: checkout_dev
-- ------------------------------------------------------
-- Server version	8.0.42-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `Courses`
--

LOCK TABLES `Courses` WRITE;
/*!40000 ALTER TABLE `Courses` DISABLE KEYS */;
INSERT INTO `Courses` VALUES (3,'yrk',2,'cs','Computer Science',1),(11,'test',9,'test_course','Test Uni Course',1),(14,'yrk',1,'cs','Computer Science',0),(15,'yrk',6,'cs','Computer Science',1);
/*!40000 ALTER TABLE `Courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Institutions`
--

LOCK TABLES `Institutions` WRITE;
/*!40000 ALTER TABLE `Institutions` DISABLE KEYS */;
INSERT INTO `Institutions` VALUES ('test','Test University'),('yrk','University of York');
/*!40000 ALTER TABLE `Institutions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Modules`
--

LOCK TABLES `Modules` WRITE;
/*!40000 ALTER TABLE `Modules` DISABLE KEYS */;
INSERT INTO `Modules` VALUES (5,'yrk',2,3,'eng1','Engineering','COM00019I'),(12,'test',9,11,'test','Test Module','test'),(16,'yrk',2,3,'sys2','Systems','COM00029I'),(17,'yrk',2,3,'the3','Theory','COM00027I'),(19,'yrk',6,15,'rocs','ROCS','COM00066H'),(20,'yrk',6,15,'quco','QUCO','COM00042H'),(21,'yrk',6,15,'qual','QUAL','COM00058H'),(22,'yrk',6,15,'plei','PLEI','COM00065H'),(23,'yrk',6,15,'nets','NETS','COM00056H'),(26,'yrk',6,15,'lptc','LPTC','LAW00062H'),(27,'yrk',6,15,'deep','DEEP','COM00049H'),(28,'yrk',6,15,'tecc','TECC','COM00054H'),(30,'yrk',6,15,'hipc','HIPC','COM00036H'),(31,'yrk',6,15,'hint','HINT','COM00040H'),(32,'yrk',6,15,'ehac','EHAC','COM00064H'),(33,'yrk',6,15,'eng2','ENG2','COM00055H'),(34,'yrk',6,15,'embs','EMBS','COM00003H'),(35,'yrk',6,15,'ctap','CTAP','COM00048H'),(36,'yrk',6,15,'vico','VICO','COM00038H'),(37,'yrk',6,15,'evac','EVAC','COM00037H'),(38,'yrk',6,15,'auro','AURO','COM00052H'),(39,'yrk',6,15,'aips','AIPS','COM00050H'),(40,'yrk',6,15,'prbx','PRBX','COM00015H');
/*!40000 ALTER TABLE `Modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Years`
--

LOCK TABLES `Years` WRITE;
/*!40000 ALTER TABLE `Years` DISABLE KEYS */;
INSERT INTO `Years` VALUES (1,'yrk',1),(2,'yrk',2),(6,'yrk',3),(9,'test',0);
/*!40000 ALTER TABLE `Years` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `globalapp`
--

LOCK TABLES `globalapp` WRITE;
/*!40000 ALTER TABLE `globalapp` DISABLE KEYS */;
INSERT INTO `globalapp` VALUES (0,0,'Not available','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,174,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','localhost:4000','deprecated',1,1,'5',0,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84');
/*!40000 ALTER TABLE `globalapp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `perms`
--

LOCK TABLES `perms` WRITE;
/*!40000 ALTER TABLE `perms` DISABLE KEYS */;
INSERT INTO `perms` VALUES ('anon','[\"register\"]',1,100),('normal','[\"register\", \"account\"]',2,500),('banned','[\"test\"]',3,3),('sysop','[\"sysop\", \"mod\", \"register\", \"autocheckin\", \"account\", \"autosysop\"]',5,0),('moderator','[\"register\", \"account\", \"mod\"]',6,1000),('autocheckin','[\"autocheckin\"]',7,500),('autosysop','[\"normal\", \"autosysop\"]',9,0);
/*!40000 ALTER TABLE `perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `users_dev`
--

LOCK TABLES `users_dev` WRITE;
/*!40000 ALTER TABLE `users_dev` DISABLE KEYS */;
INSERT INTO `users_dev` VALUES (2003,'local@checkout.ac.uk',NULL,'local','sysop','',0,'Local','','local','Disabled','2025-02-14 03:28:50','2024-11-20 23:37:26','{\"yr\": \"0\", \"crs\": \"test_course\", \"inst\": \"test\"}');
/*!40000 ALTER TABLE `users_dev` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-24 20:58:00
