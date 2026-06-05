# Smart Health Camp Registration & Reporting System

This is a simple DBMS mini project built using HTML, CSS, vanilla JavaScript, Node.js, Express, MongoDB Atlas, and session-based authentication.

## Project Modules

- Public landing page for role selection.
- Login and registration for Admin, Volunteer, and Doctor.
- Admin creates camps and adds doctors.
- Volunteer registers patients and generates token numbers.
- Doctor updates diagnosis and medicines.
- Reports page shows totals, filters, and exports.

## Folder Structure

- `Frontend` contains HTML pages, CSS, and browser JavaScript.
- `Backend` contains the Express server, routes, and MongoDB models.
- `Database` contains schema notes, sample data, and report explanation.

## How To Run

1. Open terminal in the `Backend` folder.
2. Create a `.env` file by copying values from `.env.example`.
3. Add your MongoDB Atlas connection string in `MONGODB_URI`.
4. Optionally set `SESSION_SECRET` for session security.
5. Run `npm install` if dependencies are not installed.
6. Run `npm start`.
7. Open `http://localhost:3000` in the browser.

## Main Features

- Patient registration
- Auto patient ID generation
- Token generation for queue handling
- Doctor assignment
- Consultation update
- Search and filter reports
- CSV and PDF export

## DBMS Concepts Used

- Primary key style unique patient ID
- Relationships among patient, doctor, camp, and consultation
- CRUD operations
- Search and filtering
- Aggregation for reporting
- Indexing on searchable fields
