CREATE DATABASE IF NOT EXISTS pulsefy;
USE pulsefy;

CREATE TABLE IF NOT EXISTS drug_interactions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    drug1       VARCHAR(255) NOT NULL,
    drug2       VARCHAR(255) NOT NULL,
    severity    VARCHAR(100),
    description TEXT
);

CREATE TABLE IF NOT EXISTS community_reports (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    drug        VARCHAR(255) NOT NULL,
    reaction    VARCHAR(500) NOT NULL,
    severity    VARCHAR(100) NOT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
