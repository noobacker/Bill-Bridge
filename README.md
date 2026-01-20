# Bill-Bridge

Bill-Bridge is a modern, full‑stack **inventory, production, and billing management system** built for manufacturing‑style businesses (for example, brick/block units, factories, or similar operations).

It tracks raw materials, production batches, finished goods inventory, sales invoices, partners (clients, vendors, transport), and expenses – all from a single, role‑based dashboard.

Developed by **Noobacker**.

---

## 🚀 Why Bill-Bridge?

Spreadsheets and generic accounting tools quickly become:

- **Hard to maintain** as product and partner counts grow
- **Error‑prone** for stock and GST calculations
- **Difficult to audit** across multiple users
- **Not tailored** to the production + inventory reality of manufacturing

**Bill-Bridge** is purpose‑built to solve these problems by providing:

- A **web‑based system** accessible from anywhere (desktop, laptop, tablet)
- A **clean, modern UI** with charts, tables, and dialogs for everyday operations
- **Role‑based access control** (admins vs supervisors with allowed sections)
- A **database‑backed** design (MongoDB + Prisma) for reliable, consistent data
- Built‑in **reporting on sales, production, stock, expenses, and vendors**

---

## 🧰 Tech Stack

### Core

- **Framework:** [Next.js](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI Library:** [React](https://react.dev/)
- **Routing:** Next.js App Router (`app/` directory)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with `tailwind-merge` and `tailwindcss-animate`
- **UI Components & Primitives:**
  - [Radix UI](https://www.radix-ui.com/) (`@radix-ui/react-*`)
  - [lucide-react](https://lucide.dev/) for icons
  - `cmdk`, `vaul`, `sonner`, etc. for UX enhancements
- **Authentication:** [NextAuth (Auth.js)](https://authjs.dev/) with **credentials provider**
- **ORM:** [Prisma](https://www.prisma.io/)
- **Database:** **MongoDB** (`DATABASE_URL` via Prisma datasource)
- **PDF & Document Generation:**
  - `@react-pdf/renderer`
  - `jspdf`
  - `jspdf-autotable`
  - `pdfkit`
- **Charts & Visualization:** `recharts`
- **Forms & Validation:**
  - `react-hook-form`
  - `zod`
  - `@hookform/resolvers`
- **Images:** Next.js `next/image` + `sharp`

### Tooling

- **Type Checking:** TypeScript
- **Linting:** `next lint` (ESLint)
- **Build Pipeline:** Next.js build (`next build`)
- **Package Manager:** `npm` (`package-lock.json` present)
- **Deployment Target:** [Vercel](https://vercel.com/)

---

## 📦 Features

- **Authentication & Role-Based Access**
  - Secure login via NextAuth Credentials Provider.
  - JWT‑based session strategy.
  - Support for **ADMIN** and **SUPERVISOR** roles.
  - Fine‑grained access using `allowedSections` so supervisors can see only specific parts of the app.

- **Central Business Dashboard** (`/dashboard`)
  - Product inventory cards showing **current stock per finished product**.
  - **Today’s productions** grouped by product.
  - **Monthly sales** value in INR.
  - **Raw material inventory** with:
    - Current stock vs minimum stock level.
    - **Low stock alerts** (warning icons for under‑stocked items).
  - Charts and insights:
    - `SalesChart` – sales performance over time.
    - `ProductionChart` – production trends.
    - `StockByLocationChart` – how stock is distributed across locations.
    - `LowStockAlerts` – focused view of risky materials.

- **Production Management** (`/dashboard/production`)
  - Manage **production batches** with:
    - Product type
    - Storage location
    - Production date
    - Quantities & remaining quantity
  - Server‑side pagination and search (by batch ID, storage location, product name, etc.).
  - Create new batches from `/dashboard/production/new`.
  - Data used by sales to deduct quantity **per batch**, so stock is always accurate.

- **Raw Materials Management** (`/dashboard/raw-materials`)
  - List of all raw materials with:
    - Name
    - Unit (kg, ton, etc.)
    - Current stock
    - Minimum stock level
  - Add new materials from `/dashboard/raw-materials/new`.
  - Closely tied to **expenses** and vendor purchases.

- **Partners Management (Vendors, Clients, Transport)** (`/dashboard/partners`)
  - Single screen with tabs for:
    - **Vendors** – suppliers of raw material or services.
    - **Clients** – customers you invoice.
    - **Transportation** – transport partners used in shipments.
  - Each partner tracks:
    - Count of purchases (for vendors).
    - Count of invoices (for clients and transport).
  - Additional pages like `/dashboard/vendors`, `/dashboard/clients` for focused views.

- **Sales & Invoicing** (`/dashboard/sales`)
  - Filter sales by date range (`from`, `to`) using query params.
  - Fetches invoices and consolidates **sales by product type** per invoice.
  - For each sale entry you see:
    - Quantity, rate, amount.
    - Invoice details: number, GST vs non‑GST, payment type, invoice date, total amount.
    - Partner (client) info: name, phone, contact person, email, GST number.
    - **Batch‑level details** – which production batches were consumed and from which storage locations.
  - Uses `systemSettings` for:
    - CGST, SGST, IGST rates.
    - Default brick price.
  - `CreateSaleDialog` allows quick invoice creation with:
    - Partner selection.
    - Product types and quantities.
    - Selection of available production batches and locations.
    - Automatic invoice numbering (e.g. `INV-0001`, `INV-0002`, etc.).

- **Expenses & Cost Tracking** (`/dashboard/expenses`)
  - Filter expenses by:
    - Date range (defaults to last month → today).
    - One or multiple categories (comma‑separated category IDs).
  - Automatically ensures **default expense categories** exist.
  - Each expense can be linked to:
    - Category (e.g., Raw Material, Transport, Utilities).
    - Partner (vendor).
    - Raw material (with quantity & unit).
  - Summary section with:
    - **Total expense** in the selected period.
    - **Expenses by category** (sorted by total amount).
    - **Top vendors** for raw material spend.
  - Detailed table with:
    - Vendor names resolved via partner or linked transactions.
    - Raw material details (name, quantity, unit).
    - Consistently formatted dates for reliable display.

- **Reporting & Analytics**
  - Dashboard charts for sales, production, stock, and low‑stock alerts.
  - Expense breakdown by category and vendor.
  - Combined, they provide quick insights into **profitability and cost structure**.

- **Navigation & UX**
  - Responsive **sidebar** with:
    - Entries for Dashboard, Raw Materials, Production, Sales, Expenses, Partners, Settings, and more.
    - Mobile‑friendly sheet/drawer behavior.
    - Collapsible layout (wide vs compact sidebar).
    - Role‑based visibility: admins see everything; supervisors see only allowed sections.
  - Localized headings via `I18nHeading`.
  - Smooth, modern experience using Radix, Tailwind, and lucide icons.

---

## 🔄 Business Flow / Use Cases

### 1. Production & Inventory Flow

- Admin/supervisor logs in and opens `/dashboard`.
- They navigate to **Production** (`/dashboard/production`) to:
  - Create new **production batches** with product type, quantity, storage location, and date.
  - Review recent batches and remaining quantities.
- The system aggregates:
  - Total finished stock per product (visible on dashboard cards).
  - Batch‑wise remaining quantity, used for sales and stock deduction.

**Result:** Up‑to‑date finished goods inventory at product and batch levels.

### 2. Raw Material Procurement & Monitoring

- Raw materials are defined in `/dashboard/raw-materials` with units and minimum stock levels.
- When raw materials are purchased, they are recorded as **expenses**:
  - Category = "Raw Material" (or a similar category).
  - Linked to a vendor (partner).
  - Linked to a raw material and quantity (e.g., 10 tons of clay).
- `/dashboard/expenses` then shows:
  - Total spend in a given period.
  - Spend by category.
  - Top vendors for raw material spend.

**Result:** Clear visibility into raw material consumption, vendor dependence, and procurement cost.

### 3. Partner Management (Clients, Vendors, Transport)

- `/dashboard/partners` centralizes **all business relationships**:
  - Vendors: suppliers providing raw materials/services.
  - Clients: customers buying finished goods.
  - Transport: carriers handling logistics.
- Each partner entry tracks counts of related purchases or invoices.

**Result:** A single source of truth for all stakeholders with quick insight into how much you buy from or sell to each.

### 4. Sales & Billing Flow

- On `/dashboard/sales`, users:
  - Filter sales by date range.
  - See consolidated **sales per product type per invoice**.
- When creating a new sale (with `CreateSaleDialog`):
  - Choose a **client** (partner).
  - Select product types and quantities.
  - Allocate quantities across available production batches and storage locations.
  - The system uses tax settings (CGST, SGST, IGST) and default pricing.
  - The next invoice number is automatically generated based on existing invoices.
- Saved data include:
  - `invoice` + linked `sales` + batch consumption + partner details.

**Result:** Accurate, GST‑aware invoices with production batch traceability and automatic stock deduction.

### 5. Expense & Profitability Overview

- `/dashboard/expenses` provides:
  - Total expenses for a date range.
  - Category breakdown (e.g., raw material, logistics, utilities).
  - Top vendors for raw material spending.
- Combined with:
  - **Sales totals** from dashboard and `/dashboard/sales`.
  - **Production and stock** data from `/dashboard` and `/dashboard/production`.

**Result:** A high‑level view of profitability and major cost drivers to guide better purchasing and pricing decisions.

---

## ⚙️ Environment Variables

To run the project (locally or on Vercel), you must configure at least:

```env
# MongoDB connection string used by Prisma
DATABASE_URL="mongodb+srv://USER:PASS@CLUSTER.mongodb.net/DB_NAME?retryWrites=true&w=majority"

# Public URL of your deployment (for production)
NEXTAUTH_URL="https://your-project-name.vercel.app"

# Secret key for NextAuth JWT/session signing
NEXTAUTH_SECRET="LONG_RANDOM_SECRET"
```

- Locally: put these in a `.env` file in the project root.
- On Vercel: set them under **Project → Settings → Environment Variables**.

---

## 🧪 Scripts

From `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "prisma generate && next build",
  "start": "next start",
  "lint": "next lint",
  "seed": "node prisma/seed.js",
  "postinstall": "prisma generate"
}
```

- `npm run dev` – Start the dev server on `http://localhost:3000`.
- `npm run build` – Generate Prisma client and build the Next.js app.
- `npm start` – Start the production server (after `npm run build`).
- `npm run lint` – Lint the codebase.
- `npm run seed` – Seed the database with initial data.
- `postinstall` – Auto‑runs `prisma generate` after `npm install`.

---

## 🧑‍💻 Local Development

1. **Clone the repo**

   ```bash
   git clone https://github.com/noobacker/Bill-Bridge.git
   cd Bill-Bridge
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root:

   ```env
   DATABASE_URL="your-mongodb-connection-string"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-local-dev-secret"
   ```

4. **Generate Prisma client and (optionally) seed data**

   ```bash
   npx prisma generate
   npm run seed
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

   Then open `http://localhost:3000` in your browser.

---

## ☁️ Deployment (Vercel)

This project is optimized for **Vercel**:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Development Command:** `npm run dev`

Steps:

- Push the project to GitHub (e.g., `noobacker/Bill-Bridge`).
- Import the repo into Vercel as a new project.
- Set `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET` in **Environment Variables**.
- Trigger a **Deploy**.

---

## 🧱 Roadmap / Ideas

- More granular permission system and audit logs.
- Advanced reporting and export (CSV/Excel).
- Multi‑tenant support (multiple businesses per instance).
- Customizable invoice and report templates.
- Email notifications and scheduled summaries.

---

## 👨‍💻 Author

Developed by **Noobacker**.

If you find this project useful, consider starring the repository and opening issues/PRs with ideas or improvements.
