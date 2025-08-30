# ExpressServices


ExpressServices is a two-sided marketplace that streamlines the end-to-end process of discovering, negotiating, and completing service work. Clients browse and filter services, open a conversation with a provider to align scope and availability, and then formalize the engagement as a contract. Providers manage their portfolio of services, respond to offers, and build reputation through reviews.

The application is designed to be simple to deploy and easy to maintain: a single Express API backed by MySQL, a lightweight frontend using vanilla ES modules and Bootstrap, and minimal dependencies. It favors explicit SQL queries and small, well-scoped endpoints over heavy abstractions so the behavior is transparent and auditable.

Primary user flows
- Authentication and role selection: email/password or Google Sign-In. A single account can hold both roles; when both exist, the client view is the default landing.
- Service discovery: filter by category, experience years, and hourly rate. Soft-deleted services are permanently hidden from client-facing listings and detail views.
- Conversations and messaging: per-service threads between client and provider. Timestamps are normalized to America/Bogota; conversation lists show dates, while individual messages retain precise times.
- Contracts lifecycle: the client creates an offer with agreed hours; the provider accepts or denies; both parties can mark completion. Either side can hide contracts from their view without deleting underlying data.
- Reputation and curation: clients can favorite services and leave reviews with star ratings and comments after completion.
- Account recovery and security: password reset via email, protected endpoints using JWT, and input validation on authentication and registration.

Design choices that matter
- Soft delete by default for services (`is_hidden`) to preserve history and avoid accidental data loss.
- Per-role visibility flags on contracts (`hidden_by_client`, `hidden_by_provider`) for non-destructive hiding.
- Timezone normalization to Colombia for consistent, user-expected timestamps across the app.
- Separation of concerns for texts: developer comments/logs are in English, while API/UI-facing messages remain in Spanish.
- Google Sign-In support with transactional user creation to ensure role integrity on first login.


## Key features

- Authentication and authorization
	- Email/password login and Google Sign-In (JWT).
	- Multi-role per user: client and provider.
	- Route protection middleware (`protect`).
- Services, categories, and filters
	- Filterable list by category, experience years, and hourly price.
	- Service soft delete (`is_hidden`): hidden from public/client listings.
- Contracts workflow
	- Client sends an offer (agreed hours); provider accepts or denies.
	- Both parties mark as completed; history of completed contracts.
	- Role-based hide (client/provider) without physical deletion.
- In-app chat per service
	- Conversations between client and provider linked to a service.
	- Messaging with timestamps; timezone normalized for Colombia.
- Favorites and reviews
	- Clients can favorite services.
	- Reviews with stars and comments per service.
- Password reset via email
	- Secure link delivery, token and expiration.


## Technologies used

- Platform: Node.js + Express
- Database: MySQL (mysql2/promise)
- Auth: JSON Web Tokens (JWT), Google Sign-In (Google Auth Library)
- Validation: express-validator
- Email: nodemailer
- Frontend: HTML, CSS, vanilla JavaScript (ES modules), Bootstrap 5, Bootstrap Icons
- Utilities: dotenv, CORS
- Time handling: normalization to Colombia timezone (UTC-05:00) in key endpoints


## Folder structure

```
backend/
	server.js                 # Express app (entry point)
	controllers/
		googleAuthController.js
	middleware/
		authMiddleware.js       # protect (JWT)
	models/
		db.js                   # MySQL pool (you may move to config/ if preferred)
	routes/
		categories.js
		clients.js
		code.sql                # Reference SQL schema
		contractsRoutes.js
		conversationsRoutes.js
		favorites.js
		login.js
		passwordResetRoutes.js
		providers.js
		registers.js
		reviews.js
		services.js
		usersRoutes.js
		utilsRoutes.js
	utils/
		locations.js
		sendEmail.js

frontend/
	reset-password.html
	css/styles.css
	js/
		app.js, main.js
		clientView.js, provider.js, contractHistory.js, reset-password.js
		api/ authService.js, config.js, favorites.js, provider.js, reviews.js
		handlers/ authHandlers.js, modalHandlers.js, pageHandlers.js
		ui/ chat.js
		utils/ modalUtils.js
	views/private/
		client.html, provider.html

package.json
README.md
```


## How to run

1) Requirements
- Node.js 18+ and npm.
- MySQL 8 (or compatible) running.

2) Install dependencies

```bash
npm install
```

3) Environment variables (.env at repo root)

```env
# Server
PORT=3000
EXPRESS_PORT=3000
JWT_SECRET=your_secure_secret

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=expressservices
DB_PORT=3306

# Google Sign-In
GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxxx.apps.googleusercontent.com

# Email (Nodemailer sender account)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_password_or_app_password

# Frontend URL (for reset links)
FRONTEND_URL=http://localhost:3000
```

4) Database
- Use `backend/routes/code.sql` as a schema reference.
- Create the database and tables as needed (adjust names if they differ).

5) Run the server

```bash
npm start
```

By default the API is exposed on `http://localhost:3000`.


## Main endpoints (summary)

- Auth
	- POST `/api/login` (email/password)
	- POST `/api/login/google` (Google ID token)
- Register
	- POST `/api/register/provider`
	- POST `/api/register/client`
- Users
	- GET `/api/users/check-email?email=...`
	- GET `/api/users/profile` (protected)
- Categories/Services
	- GET `/api/categories`
	- GET `/api/services` (filters: `id_category`, `experience_years`, `hour_price`)
	- GET `/api/services/my/:id_provider` (provider's services, not hidden)
	- GET `/api/services/:id` (detail, not hidden)
	- POST `/api/services` (create)
	- PUT `/api/services/:id_service` (update)
	- DELETE `/api/services/:id_service` (soft delete -> `is_hidden = TRUE`)
- Favorites (client)
	- GET `/api/favorites/:id_client`
	- POST `/api/favorites` (id_client, id_service)
	- DELETE `/api/favorites/:id_client/:id_service`
- Conversations & Messages (protected)
	- GET `/api/conversations/provider` (provider role)
	- GET `/api/conversations/client` (client role)
	- POST `/api/conversations` (start/get existing)
	- GET `/api/conversations/:id/messages`
	- POST `/api/conversations/:id/messages`
- Contracts (protected)
	- POST `/api/contracts` (client creates offer)
	- GET `/api/contracts` (list by role/user; supports `selected_rol`)
	- GET `/api/contracts/history` (both parties completed)
	- PATCH `/api/contracts/:id/respond` (provider accept/deny)
	- PATCH `/api/contracts/:id/complete` (client/provider mark completed)
	- DELETE `/api/contracts/:id` (hide by role)
	- PATCH `/api/contracts/:id/hide` | `/show` (provider)
	- PATCH `/api/contracts/:id/hide-client` | `/show-client` (client)
	- GET `/api/contracts/hidden` | `/hidden-client`
- Reviews
	- GET `/api/reviews/:id_service`
	- POST `/api/reviews`
- Utils
	- GET `/api/utils/cities` (Colombian cities list)
	- Password reset: POST `/api/password/forgot` and POST `/api/password/reset/:token`
	- GET `/api/google-client-id` (expose CLIENT_ID to frontend)


## Timezones

- Backend normalizes relevant timestamps to Colombia timezone (UTC-05:00) via derived fields like `*_co_iso` and `*_unix` (e.g., `created_at_co_iso`, `sent_at_co_iso`).
- Frontend formats these for lists (e.g., date only in conversation list) and keeps times for messages/history.


## Soft delete and hidden contracts

- Services: `is_hidden = TRUE` removes them from public/client lists and service-by-ID.
- Contracts: hidden per-role using flags (`hidden_by_client`, `hidden_by_provider`); no physical deletion.


## Security and best practices

- JWT in Authorization: `Bearer <token>` for protected routes.
- Validations via `express-validator` in login/register.
- Password reset tokens hashed with expiration.
- API error/response texts are Spanish (UI-facing). Backend comments/logs are English for maintainability.


## npm scripts

```json
{
	"start": "node backend/server.js"
}
```


## Troubleshooting

- Port in use: adjust `PORT`/`EXPRESS_PORT` in `.env`.
- MySQL connection: check `.env` credentials and ensure MySQL is running.
- Google Sign-In: verify `GOOGLE_CLIENT_ID` and allowed origin in Google console.
- Email sending: use Gmail App Passwords or another SMTP provider.


## Credits

- Brahiam Ruiz Alzate (Product Owner)
- Johan Ramírez Marín (Scrum Master)
- Andrés Felipe Marín Patiño (Developer)
- Juan Daniel Rúa Marín (Developer)
- Juan Manuel Arango Arana (Developer)
