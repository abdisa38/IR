# Ilillii Bar & Restaurant - Backend API

Production Express + TypeScript + Mongoose REST API connected to MongoDB Atlas.

## 🚀 Architecture & Features

- **Database**: MongoDB Atlas (`ilillii_db`)
- **Runtime**: Node.js + Express + TypeScript
- **Live Collections**:
  - `menuitems`: 36 authentic Ethiopian/Oromo dishes & beverages with Afaan Oromo, Amharic translations, prices in ETB, and photos.
  - `orders`: Real-time order tracking (`IL-XXXX`), dine-in (with table assignment) & pickup takeaway, payment statuses (`pay_after_eating`, `paid`).
  - `staffs`: Staff registry with roles (Manager, Waiter, Kitchen Staff, Cashier), contact info, and active/on-break statuses.
  - `settings`: Restaurant configuration (Manager contact `0909511588`, Location in Bale Robe around Awraris & General Wako Gutu Square).
- **Analytics Engine**: Real-time aggregation of total revenue, today's sales, active orders, and top selling dishes.

## Security configuration and deployment

Set `MONGODB_URI` and a unique, randomly generated `JWT_SECRET` of at least 32 characters in the deployment environment; neither is bundled with the application. Rotate any database credentials previously committed to the repository and replace any previously used JWT secret. Removing them from current files does not remove them from Git history. Configure `GOOGLE_CLIENT_ID` to the trusted Google OAuth client ID to enable Google sign-in. For a frontend on another origin, set `CORS_ORIGIN` to a comma-separated list of exact permitted origins; same-origin requests need no entry. Do not use `*`.

Staff sign-in requires an active staff record and an individual password. Sensitive management routes require staff authorization, with manager-only access for staff, settings and menu management. Customer order creation remains public. Order lists, lookups, changes and customer order history are restricted because existing orders have no securely verified owner. Guest order tracking, adding items to an existing order and cancellation will not work until secure order ownership is implemented. Legacy accounts with weak or missing staff passwords must be reset before use; use the database's staff record `_id` and run this command locally as a trusted operator from the `backend` directory, with `MONGODB_URI` configured. Do not put the password in a command argument or shell history:

```bash
read -r -s -p 'New staff password: ' STAFF_PASSWORD; echo
printf '%s' "$STAFF_PASSWORD" | node scripts/set-staff-password.mjs <staff-mongodb-id>
unset STAFF_PASSWORD
```

The password must be at least 12 characters, no more than 72 UTF-8 bytes, and include uppercase and lowercase letters, a number and a symbol. After securely resetting the first manager's password, use the staff management screen to set credentials for other staff. The command only changes existing staff records and is not exposed over HTTP.

Authentication attempts have a per-process rate limit. Serverless instances do not share its counter; configure a shared rate limiter at the deployment edge before exposing the service to the internet. Payment flows are still for testing and are not production-safe. Do not accept real payments until payment verification, webhook authentication and server-side pricing have been secured and tested.

## 📡 REST API Endpoints

### Menu
- `GET /api/menu`: List all menu items (optional query `category`, `search`, `availableOnly`)
- `GET /api/menu/:id`: Get single menu item by ID
- `POST /api/menu`: Create a new menu dish
- `PUT /api/menu/:id`: Update dish details (name, price, amharicName, category, etc.)
- `PATCH /api/menu/:id/toggle-available`: Toggle availability in real-time
- `PATCH /api/menu/:id/toggle-special`: Toggle House Special badge
- `DELETE /api/menu/:id`: Delete menu dish

### Orders
- `GET /api/orders`: List all orders (optional query `status`, `type`, `limit`)
- `GET /api/orders/:identifier`: Retrieve order by order number (e.g., `IL-1001`) or MongoDB ID
- `POST /api/orders`: Place a new customer order (auto-assigns `IL-XXXX` reference)
- `PATCH /api/orders/:id/status`: Update status (`pending`, `preparing`, `ready`, `completed`, `cancelled`)
- `PATCH /api/orders/:id/payment`: Update payment status (`paid`, `unpaid`, `pay_after_eating`)
- `DELETE /api/orders/:id`: Cancel order

### Staff
- `GET /api/staff`: List all staff members
- `POST /api/staff`: Register a new staff member
- `PUT /api/staff/:id`: Update staff details
- `PATCH /api/staff/:id/status`: Toggle active / on break status
- `DELETE /api/staff/:id`: Remove staff member

### Analytics & Reports
- `GET /api/analytics`: Real-time restaurant dashboard KPIs (Revenue in ETB, active orders count, popular dishes)

### Settings
- `GET /api/settings`: Get restaurant info & manager contact
- `PUT /api/settings`: Update phone, location, hours, and name

### Health Check
- `GET /api/health`: System health and uptime

## 🛠️ Local Development & Scripts

```bash
# Install dependencies
npm install

# Run database seed (populates 36 dishes, staff, and initial orders)
npm run seed

# Run in development mode (with hot-reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
