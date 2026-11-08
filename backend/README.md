# Ilillii Bar & Restaurant - Backend API

Production Express + TypeScript + Mongoose REST API connected to MongoDB Atlas.

## 🚀 Architecture & Features

- **Database**: MongoDB Atlas (`ilillii_db`)
- **Runtime**: Node.js + Express + TypeScript
- **Live Collections**:
  - `menuitems`: 36 authentic Ethiopian/Oromo dishes & beverages with Afaan Oromo, Amharic translations, prices in ETB, and photos.
  - `orders`: Real-time order tracking (`IL-XXXX`), dine-in (with table assignment) & pickup takeaway, payment statuses (`pay_after_eating`, `paid`).
  - `staffs`: Staff registry with roles (Manager, Waiter, Kitchen Staff, Cashier), contact info, and active/on-break statuses.
  - `settings`: Restaurant configuration (Manager contact `09511588`, Location in Bale Robe around Awraris & General Wako Gutu Square).
- **Analytics Engine**: Real-time aggregation of total revenue, today's sales, active orders, and top selling dishes.

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
