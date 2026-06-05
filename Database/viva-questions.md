# Viva Questions And Answers

## 1. What is the objective of this project?

The objective is to digitize patient registration, doctor consultation, and report generation in health camps using a database-driven web application.

## 2. Why did you choose MongoDB Atlas?

MongoDB Atlas is easy to connect with Node.js, works in the cloud, stores data in collections, and is simple for a mini project.

## 3. Which collections are used in this project?

The project uses four collections: camps, doctors, patients, and consultations.

## 4. What is the main relationship in this project?

The main relationship is that one patient can have many consultations, one doctor can handle many consultations, and one camp can include many doctors and consultations.

## 5. How is patient ID generated?

The system counts existing patients and creates the next ID in the format `PAT001`, `PAT002`, and so on.

## 6. How is token number generated?

The system checks the latest token number for the selected camp and adds one to create the next queue number.

## 7. Which DBMS concepts are demonstrated?

This project demonstrates CRUD operations, relationships, indexing, aggregation, filtering, and structured data storage.

## 8. What reports are generated?

The system shows total patients, total registrations, gender-wise count, age-group distribution, disease trends, and filtered registration records.

## 9. What is the role of the consultation collection?

The consultation collection links patient, doctor, and camp together and stores diagnosis, medicines, token number, and status.

## 10. What are the user roles in this project?

The project is organized into admin, volunteer, and doctor work sections. Admin creates camps and doctors, volunteer registers patients, and doctor updates consultations.

## 11. Why is this project suitable for DBMS?

It uses structured data, relationships, search, reporting, and real-world records management, which are core DBMS ideas.

## 12. What happens when MongoDB Atlas is not connected?

The server can start, but live data operations will not work until a valid connection string is added in the environment file.
