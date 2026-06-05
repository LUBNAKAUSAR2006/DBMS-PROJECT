# Schema Explanation

## 1. Camp Collection

Stores health camp information.

Fields:
- `campName`: name of the camp
- `campDate`: date of the camp
- `location`: place where camp is conducted
- `purpose`: reason for conducting the camp

## 2. Doctor Collection

Stores doctor details.

Fields:
- `doctorName`: doctor name
- `specialization`: doctor specialization
- `camp`: reference to the camp document

## 3. Patient Collection

Stores patient basic details.

Fields:
- `patientId`: unique ID like `PAT001`
- `fullName`: patient name
- `age`: patient age
- `gender`: patient gender
- `phone`: patient contact number
- `city`: patient city

## 4. Consultation Collection

Stores registration and treatment details.

Fields:
- `patient`: reference to patient
- `camp`: reference to camp
- `doctor`: reference to doctor
- `tokenNumber`: queue number for patient in a camp
- `symptoms`: initial or final symptom details
- `diagnosis`: doctor diagnosis
- `medicines`: doctor prescription
- `registrationTime`: time of registration
- `status`: `Pending` or `Completed`

## Why This Schema Is Good

- It avoids repeating doctor and camp details inside every patient document.
- It supports one-to-many relationships clearly.
- It makes report generation easier.
- It keeps the design simple and explainable for a DBMS lab.
