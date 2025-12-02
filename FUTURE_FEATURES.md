## Future Feature Ideas for Rockz & Rollz

This document collects ideas for **future enhancements** to the Rockz & Rollz application.  
They are grouped by area so we can pick and implement them later without disturbing the current stable setup.

---

### 1. Offers & Promotions

- **Coupon codes / promo codes**
  - Allow entering a code at checkout (e.g. `RRZ50`) to apply percentage or flat discounts.
  - Store coupons in a `Coupons` table with:
    - Code, Type (percentage/flat), Value, Start/End dates, Max uses, Active flag.
  - Validate coupons server‑side on `/api/orders` and reflect the discount in the order summary.

- **Happy hour / time‑based offers**
  - Define rules like “10% off between 4–6 PM on weekdays”.
  - Compute discount dynamically in the backend using current server time.

- **First‑order discount**
  - Detect a user’s first order and apply a one‑time discount.

---

### 2. Receipts & Billing

- **Order receipt view**
  - Dedicated page/section to show a clean, printable receipt for each order:
    - Items, quantities, rates, subtotals, discounts, taxes (if any), final total.
  - “Download as PDF” / “Print” button using browser print or a PDF library on the client.

- **Email receipt**
  - Optional: send a receipt email after successful order.
  - Requires SMTP or an email service (e.g. SendGrid) and an `EmailLogs` table.

---

### 3. Delivery / Order Status Details

- **More granular status**
  - Extend `Orders.Status` beyond `Pending / Accepted / Completed` to:
    - `Preparing`, `ReadyForPickup`, `OutForDelivery`, `Completed`, `Cancelled`.
  - Keep the existing admin buttons and add more controls as needed (e.g. “Mark as Preparing”).

- **Customer‑visible timeline**
  - On the customer Orders page, show a small timeline or chips:
    - Example: `Pending → Accepted → Preparing → Completed`.
  - Color‑code each status for clarity.

---

### 4. Multi‑Branch / Multi‑Outlet Support

- **Branch model**
  - Add a `Branches` table with:
    - Id, Name, Address, Phone, Active flag.
  - Add `BranchId` to `Orders`, `Carts`, and optionally `Users`.

- **Branch selection**
  - On login or first order, let the user pick a **branch** (dropdown or cards).
  - Filter menu, offers, and order history by selected branch.

- **Branch‑admin**
  - Support per‑branch admin logins in addition to the master admin:
    - Each branch admin can see only their branch’s orders, contacts, and stats.

---

### 5. Customer Feedback & Ratings

- **Post‑order rating**
  - After an order is marked `Completed`, allow the customer to rate (1–5 stars) and leave a short comment.
  - Store in a `OrderFeedback` or `Ratings` table with:
    - OrderId, UserId, Rating, Comment, CreatedAt.

- **Admin sentiment view**
  - In admin dashboard, add a “Feedback” tab:
    - Recent feedback, average rating, and filters by date/branch.

---

### 6. Menu Management (Admin)

- **Dynamic menu from DB**
  - Move `menu.json` into a database table `MenuItems` with:
    - Name, Price, Category, IsAvailable, Optional Image URL.
  - Admin UI to:
    - Add/Remove/Update items.
    - Toggle availability (e.g. temporarily hide out‑of‑stock items).

- **Categories & filters**
  - Add categories (e.g. Rolls, Shakes, Sodas) and a filter bar on the Menu page.

---

### 7. Security & Accounts

- **Password reset flow**
  - “Forgot password” link:
    - Generates a secure token and email link to reset password.
  - Add `PasswordResetTokens` table:
    - UserId, Token, Expiry, Used flag.

- **Optional phone‑based login**
  - Allow login by mobile number + OTP in addition to email/password.
  - Needs SMS gateway integration and rate‑limiting.

---

### 8. Performance & UX Improvements

- **Client‑side caching**
  - Cache menu data in `localStorage` with a short TTL to reduce repeated fetches.

- **Skeleton loaders**
  - Replace plain loaders with skeleton cards for Menu, Orders, and Admin tables.

- **Analytics**
  - (Optional) Basic analytics on most ordered items, peak times, etc., using simple aggregate queries and charts in admin.

---

### Implementation Notes

- All new features should:
  - Respect existing **database structure** or extend it carefully with migrations.
  - Keep **admin vs user** separation clear in both navigation and APIs.
  - Preserve current Windows‑Auth–based MSSQL connection setup in `backend/server.js`.
- This file is **documentation only**; actual implementation should be done in small, tested steps to avoid breaking the working application.


