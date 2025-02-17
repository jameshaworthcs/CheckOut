-- MySQL dump 10.13  Distrib 8.0.41, for Linux (x86_64)
--
-- Host: localhost    Database: checkout_dev
-- ------------------------------------------------------
-- Server version	8.0.41-0ubuntu0.24.04.1

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
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=8257 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=768156 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
-- Table structure for table `tibl_test_test_course_0`
--

DROP TABLE IF EXISTS `tibl_test_test_course_0`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tibl_test_test_course_0` (
  `Description` varchar(255) DEFAULT NULL,
  `Module code` varchar(50) DEFAULT NULL,
  `Start week` varchar(50) DEFAULT NULL,
  `Start day` varchar(50) DEFAULT NULL,
  `Start date` date DEFAULT NULL,
  `Start time` time DEFAULT NULL,
  `End day` varchar(50) DEFAULT NULL,
  `End date` date DEFAULT NULL,
  `End time` time DEFAULT NULL,
  `Duration` varchar(50) DEFAULT NULL,
  `Type` varchar(50) DEFAULT NULL,
  `Staff member(s)` varchar(255) DEFAULT NULL,
  `Location(s)` varchar(255) DEFAULT NULL,
  `Student(s)` varchar(255) DEFAULT NULL,
  `Department` varchar(255) DEFAULT NULL,
  `Size` int DEFAULT NULL,
  `Activity reference` varchar(500) DEFAULT NULL,
  `Activity details` varchar(255) DEFAULT NULL,
  `Draft` varchar(50) DEFAULT NULL,
  `Module description` varchar(255) DEFAULT NULL,
  `Number of students` varchar(50) DEFAULT NULL,
  `Weekly pattern` varchar(255) DEFAULT NULL,
  `This activity takes place on location` varchar(50) DEFAULT NULL,
  `This activity takes place online` varchar(50) DEFAULT NULL,
  `Online session details` varchar(255) DEFAULT NULL,
  `Description2` varchar(255) DEFAULT NULL,
  `activityID` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`activityID`)
) ENGINE=InnoDB AUTO_INCREMENT=100313 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tibl_yrk_cs_1`
--

DROP TABLE IF EXISTS `tibl_yrk_cs_1`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tibl_yrk_cs_1` (
  `Description` varchar(255) DEFAULT NULL,
  `Module code` varchar(50) DEFAULT NULL,
  `Start week` varchar(50) DEFAULT NULL,
  `Start day` varchar(50) DEFAULT NULL,
  `Start date` date DEFAULT NULL,
  `Start time` time DEFAULT NULL,
  `End day` varchar(50) DEFAULT NULL,
  `End date` date DEFAULT NULL,
  `End time` time DEFAULT NULL,
  `Duration` varchar(50) DEFAULT NULL,
  `Type` varchar(50) DEFAULT NULL,
  `Staff member(s)` varchar(255) DEFAULT NULL,
  `Location(s)` varchar(255) DEFAULT NULL,
  `Student(s)` varchar(255) DEFAULT NULL,
  `Department` varchar(255) DEFAULT NULL,
  `Size` int DEFAULT NULL,
  `Activity reference` varchar(500) DEFAULT NULL,
  `Activity details` varchar(255) DEFAULT NULL,
  `Draft` varchar(50) DEFAULT NULL,
  `Module description` varchar(255) DEFAULT NULL,
  `Number of students` varchar(50) DEFAULT NULL,
  `Weekly pattern` varchar(255) DEFAULT NULL,
  `This activity takes place on location` varchar(50) DEFAULT NULL,
  `This activity takes place online` varchar(50) DEFAULT NULL,
  `Online session details` varchar(255) DEFAULT NULL,
  `Description2` varchar(255) DEFAULT NULL,
  `activityID` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`activityID`)
) ENGINE=InnoDB AUTO_INCREMENT=42315 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tibl_yrk_cs_1_v2`
--

DROP TABLE IF EXISTS `tibl_yrk_cs_1_v2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tibl_yrk_cs_1_v2` (
  `Description` varchar(255) DEFAULT NULL,
  `Module code` varchar(50) DEFAULT NULL,
  `Start week` varchar(50) DEFAULT NULL,
  `Start day` varchar(50) DEFAULT NULL,
  `Start date` date DEFAULT NULL,
  `Start time` time DEFAULT NULL,
  `End day` varchar(50) DEFAULT NULL,
  `End date` date DEFAULT NULL,
  `End time` time DEFAULT NULL,
  `Duration` varchar(50) DEFAULT NULL,
  `Type` varchar(50) DEFAULT NULL,
  `Staff member(s)` varchar(255) DEFAULT NULL,
  `Location(s)` varchar(255) DEFAULT NULL,
  `Student(s)` varchar(255) DEFAULT NULL,
  `Department` varchar(255) DEFAULT NULL,
  `Size` int DEFAULT NULL,
  `Activity reference` varchar(500) DEFAULT NULL,
  `Activity details` varchar(255) DEFAULT NULL,
  `Draft` varchar(50) DEFAULT NULL,
  `Module description` varchar(255) DEFAULT NULL,
  `Number of students` varchar(50) DEFAULT NULL,
  `Weekly pattern` varchar(255) DEFAULT NULL,
  `This activity takes place on location` varchar(50) DEFAULT NULL,
  `This activity takes place online` varchar(50) DEFAULT NULL,
  `Online session details` varchar(255) DEFAULT NULL,
  `Description2` varchar(255) DEFAULT NULL,
  `activityID` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`activityID`)
) ENGINE=InnoDB AUTO_INCREMENT=42315 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tibl_yrk_cs_2`
--

DROP TABLE IF EXISTS `tibl_yrk_cs_2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tibl_yrk_cs_2` (
  `Description` varchar(255) DEFAULT NULL,
  `Module code` varchar(50) DEFAULT NULL,
  `Start week` varchar(50) DEFAULT NULL,
  `Start day` varchar(50) DEFAULT NULL,
  `Start date` date DEFAULT NULL,
  `Start time` time DEFAULT NULL,
  `End day` varchar(50) DEFAULT NULL,
  `End date` date DEFAULT NULL,
  `End time` time DEFAULT NULL,
  `Duration` varchar(50) DEFAULT NULL,
  `Type` varchar(50) DEFAULT NULL,
  `Staff member(s)` varchar(255) DEFAULT NULL,
  `Location(s)` varchar(255) DEFAULT NULL,
  `Student(s)` varchar(255) DEFAULT NULL,
  `Department` varchar(255) DEFAULT NULL,
  `Size` int DEFAULT NULL,
  `Activity reference` varchar(500) DEFAULT NULL,
  `Activity details` varchar(255) DEFAULT NULL,
  `Draft` varchar(50) DEFAULT NULL,
  `Module description` varchar(255) DEFAULT NULL,
  `Number of students` varchar(50) DEFAULT NULL,
  `Weekly pattern` varchar(255) DEFAULT NULL,
  `This activity takes place on location` varchar(50) DEFAULT NULL,
  `This activity takes place online` varchar(50) DEFAULT NULL,
  `Online session details` varchar(255) DEFAULT NULL,
  `Description2` varchar(255) DEFAULT NULL,
  `activityID` int NOT NULL DEFAULT '0'
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

-- Dump completed on 2025-02-17  1:12:22
-- MySQL dump 10.13  Distrib 8.0.41, for Linux (x86_64)
--
-- Host: localhost    Database: checkout_dev
-- ------------------------------------------------------
-- Server version	8.0.41-0ubuntu0.24.04.1

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

-- Dump completed on 2025-02-17  1:12:22
-- MySQL dump 10.13  Distrib 8.0.41, for Linux (x86_64)
--
-- Host: localhost    Database: checkout_dev
-- ------------------------------------------------------
-- Server version	8.0.41-0ubuntu0.24.04.1

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
INSERT INTO `Courses` VALUES (3,'yrk',2,'cs','Computer Science',1),(4,'ysj',1,'history_y1_ysj','History',0),(5,'ysj',1,'psych_y1_ysj','Psychology',0),(6,'ysj',2,'cs_y2_ysj','Computer Science',0),(7,'ark',5,'example-ark-y5','Example yr5 Course',0),(8,'ark',8,'test_ark_y4','Test Course',0),(11,'test',9,'test_course','Test Uni Course',1),(12,'demo',10,'demo-crs','Demonstration Course',0),(14,'yrk',1,'cs','Computer Science',0);
/*!40000 ALTER TABLE `Courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Institutions`
--

LOCK TABLES `Institutions` WRITE;
/*!40000 ALTER TABLE `Institutions` DISABLE KEYS */;
INSERT INTO `Institutions` VALUES ('aberdeen','University of Aberdeen'),('abertay','Abertay University'),('aberystwyth','Aberystwyth University'),('arden','Arden University'),('ark','Anglia Ruskin University'),('aston','Aston University'),('bangor','Bangor University'),('bath','University of Bath'),('bathspa','University of Bath Spa'),('bcu','Birmingham City University'),('bedfordshire','University of Bedfordshire'),('birmingham','University of Birmingham'),('bolton','University of Bolton'),('bournemouth','Bournemouth University'),('bradford','University of Bradford'),('brighton','University of Brighton'),('bristol','University of Bristol'),('brookes','Oxford Brookes University'),('brunel','Brunel University London'),('buckingham','University of Buckingham'),('bucks','Buckinghamshire New University'),('caledonian','Glasgow Caledonian University'),('cambridge','University of Cambridge'),('canterbury','Canterbury Christ Church University'),('cardiff','Cardiff University'),('cardiffmet','Cardiff Metropolitan University'),('chester','University of Chester'),('chichester','University of Chichester'),('city','City, University of London'),('coventry','Coventry University'),('cranfield','Cranfield University'),('cumbria','University of Cumbria'),('demo','Demo Institution'),('derby','University of Derby'),('dmu','De Montfort University'),('dundee','University of Dundee'),('durham','Durham University'),('edgehill','Edge Hill University'),('edinburgh','University of Edinburgh'),('essex','University of Essex'),('exeter','University of Exeter'),('falmouth','Falmouth University'),('glasgow','University of Glasgow'),('glos','University of Gloucestershire'),('goldsmiths','Goldsmiths, University of London'),('greenwich','University of Greenwich'),('harper','Harper Adams University'),('herts','University of Hertfordshire'),('hope','Liverpool Hope University'),('huddersfield','University of Huddersfield'),('hull','University of Hull'),('imperial','Imperial College London'),('kcl','King\'s College London'),('keele','Keele University'),('kent','University of Kent'),('kingston','Kingston University'),('lancaster','Lancaster University'),('lboro','Loughborough University'),('leeds','University of Leeds'),('leedsarts','Leeds Arts University'),('leedsbeckett','Leeds Beckett University'),('leedstrinity','Leeds Trinity University'),('leicester','University of Leicester'),('lincoln','University of Lincoln'),('liverpool','University of Liverpool'),('ljmu','Liverpool John Moores University'),('londonmet','London Metropolitan University'),('lsbu','London South Bank University'),('lse','London School of Economics and Political Science'),('manchester','University of Manchester'),('marjon','Plymouth Marjon University'),('mdx','Middlesex University'),('mmu','Manchester Metropolitan University'),('napier','Edinburgh Napier University'),('newcastle','Newcastle University'),('northampton','University of Northampton'),('northumbria','Northumbria University'),('nottingham','University of Nottingham'),('ntu','Nottingham Trent University'),('open','Open University'),('oxford','University of Oxford'),('plymouth','University of Plymouth'),('portsmouth','University of Portsmouth'),('qmul','Queen Mary University of London'),('qub','Queen\'s University Belfast'),('queenmargaret','Queen Margaret University, Edinburgh'),('rau','Royal Agricultural University'),('ravensbourne','Ravensbourne University London'),('rca','Royal College of Art'),('reading','University of Reading'),('regents','Regent\'s University London'),('rhul','Royal Holloway, University of London'),('roehampton','University of Roehampton'),('rvc','Royal Veterinary College'),('salford','University of Salford'),('sheffield','University of Sheffield'),('shu','Sheffield Hallam University'),('solent','Solent University'),('southampton','University of Southampton'),('southwales','University of South Wales'),('staffs','Staffordshire University'),('standrews','University of St Andrews'),('stgeorges','St George\'s, University of London'),('stirling','University of Stirling'),('stmarys','St Mary\'s University, Twickenham'),('strathclyde','University of Strathclyde'),('suffolk','University of Suffolk'),('sunderland','University of Sunderland'),('surrey','University of Surrey'),('sussex','University of Sussex'),('swansea','Swansea University'),('teesside','Teesside University'),('test','Test University'),('trinitystd','University of Wales, Trinity Saint David'),('ual','University of the Arts London'),('uca','University for the Creative Arts'),('uclan','University of Central Lancashire'),('uea','University of East Anglia'),('uel','University of East London'),('ulster','University of Ulster'),('uwe','University of the West of England'),('uws','University of the West of Scotland'),('wales','University of Wales'),('warwick','University of Warwick'),('westlondon','University of West London'),('westminster','University of Westminster'),('winchester','University of Winchester'),('wolverhampton','University of Wolverhampton'),('worcester','University of Worcester'),('yrk','University of York'),('ysj','York St John University');
/*!40000 ALTER TABLE `Institutions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Modules`
--

LOCK TABLES `Modules` WRITE;
/*!40000 ALTER TABLE `Modules` DISABLE KEYS */;
INSERT INTO `Modules` VALUES (5,'yrk',2,3,'eng1','Engineering','COM00019I'),(6,'ysj',1,4,'history-1','History Part 1',NULL),(7,'ysj',1,4,'history-2','History Part 2',NULL),(8,'ysj',1,5,'psychology-1','Psychology - The Human Mind',NULL),(9,'ysj',2,6,'software-3','Software Part 3',NULL),(10,'ark',8,8,'example','Example Module',NULL),(11,'test',9,11,'module1','Example Module 1',NULL),(12,'test',9,11,'module2','Example Module 2',NULL),(14,'demo',10,12,'demo1','Demonstration Module 1',NULL),(15,'demo',10,12,'demo2','Demonstration Module 2',NULL),(16,'yrk',2,3,'sys2','Systems','COM00029I'),(17,'yrk',2,3,'the3','Theory','COM00027I');
/*!40000 ALTER TABLE `Modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Years`
--

LOCK TABLES `Years` WRITE;
/*!40000 ALTER TABLE `Years` DISABLE KEYS */;
INSERT INTO `Years` VALUES (1,'yrk',1),(2,'yrk',2),(3,'ysj',1),(4,'ysj',2),(5,'ark',5),(6,'yrk',3),(7,'yrk',4),(8,'ark',4),(9,'test',0),(10,'demo',1);
/*!40000 ALTER TABLE `Years` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `globalapp`
--

LOCK TABLES `globalapp` WRITE;
/*!40000 ALTER TABLE `globalapp` DISABLE KEYS */;
INSERT INTO `globalapp` VALUES (1,0,'Easter!','https://rejectdopamine.com/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,139,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter!','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'Easter!','https://rejectdopamine.com/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,140,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter!','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'Easter!','https://rejectdopamine.com/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,141,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter!','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'Easter!','https://rejectdopamine.com/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,142,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter!','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'Easter!','https://rejectdopamine.com/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,143,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter!','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'Easter!','https://rejectdopamine.com/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,144,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter!','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'Easter!','https://rejectdopamine.com/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,145,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter!','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'Easter!','https://rejectdopamine.com/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,146,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter!','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'Easter!','https://rejectdopamine.com/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,147,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter!','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'Easter!','https://rejectdopamine.com/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,148,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter!','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'Easter!','https://rejectdopamine.com/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,149,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter!','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'App is unavailable while classes are not in session.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,150,0,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable, please try again later','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'App is unavailable while classes are not in session.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,151,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable, please try again later','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'App is unavailable while classes are not in session.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,152,0,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'App is unavailable while classes are not in session.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,153,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Easter','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,154,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,155,0,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,156,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,157,0,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,158,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,159,0,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,160,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,161,0,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,162,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,163,0,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,164,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','beta.checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,165,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','beta.checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(1,0,'Unavailable out of term time.','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,166,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','beta.checkout.ac','deprecated',1,1,'30',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Not available','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,167,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,0,'5',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Not available','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,168,0,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,0,'5',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Not available','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,169,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,0,'5',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Not available','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,170,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','localhost:4000','deprecated',1,0,'5',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Not available','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,171,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','checkout.ac','deprecated',1,0,'5',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Not available','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,172,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','localhost:4000','deprecated',1,0,'5',1,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Not available','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,173,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','localhost:4000','deprecated',1,0,'5',0,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84'),(0,0,'Not available','https://checkout.ac/','Example message for when android app is disabled, to display to users','https://example-learn-more-url.com/','deprecated','deprecated','deprecated','yrk',0,174,1,0,'Message to display to all users during a boycott','https://boycott-example-learn-more.com','localhost:4000','deprecated',1,1,'5',0,'09:00','19:00','Unavailable outside of term time.','https://www.youtube.com/watch?v=cc2-4ci4G84');
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
-- Dumping data for table `tibl_test_test_course_0`
--

LOCK TABLES `tibl_test_test_course_0` WRITE;
/*!40000 ALTER TABLE `tibl_test_test_course_0` DISABLE KEYS */;
INSERT INTO `tibl_test_test_course_0` VALUES ('Lecture (Theory) - COM00016C-A','dev.friday-16:00-23:59','Week 1, Semester 2','Mon','2024-04-08','00:00:00','Mon','2030-02-01','00:00:00','1:00','Lecture','Appiah, Kofi (Dr)','PZA/103 Lecture Theatre, Campus East - Piazza Building','','Computer Science',231,'Local development','','No','Software 2: Object Oriented Data Structures & Algorithms','','','No','No','','',100000),('Lecture 2 - COM00014C-A','COM00014C','Week 2, Semester 2','Tue','2024-02-20','11:30:00','Tue','2030-02-01','12:30:00','1:00','Lecture','King, Steve (Prof), Miyazawa, Alvaro (Dr)','PZA/103 Lecture Theatre, Campus East - Piazza Building','','Computer Science',231,'Lecture 2','','No','Theory 2: Formal Languages & Automata','','','No','No','','',100001),('Lecture 1 - COM00014C-A','COM00014C','Week 1, Semester 2','Mon','2030-01-01','17:30:00','Mon','2030-02-01','18:30:00','1:00','Lecture','King, Steve (Prof), Miyazawa, Alvaro (Dr)','PZA/103 Lecture Theatre, Campus East - Piazza Building','','Computer Science',231,'Lecture 1','','No','Theory 2: Formal Languages & Automata','','','No','No','','',100002);
/*!40000 ALTER TABLE `tibl_test_test_course_0` ENABLE KEYS */;
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

-- Dump completed on 2025-02-17  1:12:22
