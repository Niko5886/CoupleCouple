## Dating Site
The site is intended for adult couples seeking other such couples for swing meetings. Users register / log in, and after confirming they are over 18 years old (adults), they can fill out their profile with personal information (everything marked as mandatory). They can search for other users, add them as friends, send messages, exchange photos in private chat, like photos in others' profiles, remove existing friendships, delete existing messages, delete their own profile if desired, and more. The site also has an admin panel where administrators can manage users, view statistics, and perform other administrative tasks. The site is designed to be user-friendly, visually appealing, and secure, with a focus on privacy and data protection.After all users have registered, administrators must explicitly approve each registration request and control their photos.

## Architecture and Tech Stack              ок.

Classical client-server app:
Front-end: JS app, Bootstrap, HTML, CSS
Back-end: Supabase
Database: PostgreSQL
Authentication: Supabase Auth
Build tools: Vite, npm
API: Supabase REST API
Hosting: Netlify
Source code: GitHub
## Modular design 

Use modular code structure, with separate files for different components, pages, and features.Use ES6 modules to organize the code .

## UI Guidelines                                    ок.
Use HTML, CSS and vanilla JS for the front-end.
Use modern, responsive UI design principles.
Use a consistent color scheme and typography throughout the app.
Use appropriate icons, effects and visual cues to enhance usability.

## Pages and Navigation

Split the app into multiple pages: login, registration, list of users, personal messages, search, friends, favorites, who visited me, admin panel, etc.
Implement pages as reusable components (HTML, CSS and JS code).
Use routing to navigate between pages.
Use full URLs like: /, /login, /register, /list-of-users, /messages/{id}/search, /admin, etc.
## Backend and Database

Use Supabase as the backend and database for the app.
Use PostgreSQL as the database, with tables for users, projects, tasks, etc.
Use Supabase Storage for file uploads (e.g. task attachments).
When changing the DB schema, always use migrations to keep track of changes.
After applying a migration in Supabase, keep a copy of the migration SQL file in the code.

## Authentication and Authorization

Use Supabase Auth for user authentication and authorization.
Implement RLS policies to restrict access to data based on user roles and permissions.
Implement user roles with a separate DB table user_roles + enum roles (e.g. admin, user).

## Отговаряй ми винаги на БЪЛГАРСКИ ЕЗИК , без значение на какъв език ти задавам въпрос или задача.