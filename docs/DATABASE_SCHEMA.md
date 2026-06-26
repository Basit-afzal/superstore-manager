# SuperStore Manager — Database Schema

MongoDB collections (Mongoose models) for SuperStore Manager. Schemas follow project conventions:

- `timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }`
- `toJSON` transform exposes `id` (string) and removes `_id` / `__v`
- All tenant-scoped collections include `store_id` referencing `Store`

**Status legend:** ✅ Implemented · 📋 Planned

---

## Table of Contents

1. [Entity Diagram](#1-entity-diagram)
2. [Implemented Schemas](#2-implemented-schemas)
3. [Planned Schemas (MVP)](#3-planned-schemas-mvp)
4. [Planned Schemas (Growth)](#4-planned-schemas-growth)
5. [Indexes](#5-indexes)
6. [Relationship Reference](#6-relationship-reference)
7. [Transaction Patterns](#7-transaction-patterns)

---

## 1. Entity Diagram

```
stores (tenant root)
  │
  ├── products ────────── inventory (1:1 per product)
  │       │                    │
  │       │                    └── inventory_transactions
  │       │
  │       └── sale_items ◄── sales ──► salesmen ──► employees
  │
  ├── employees
  ├── categories
  ├── suppliers ── purchase_orders ── purchase_order_items
  └── customers (optional)
```

---

## 2. Implemented Schemas

### 2.1 `stores` ✅

**File:** `server/src/models/store.js`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| store_name | String | Yes | Display name |
| location | String | Yes | Address / city |
| owner_name | String | Yes | |
| email | String | Yes | Unique; used for login |
| password | String | Yes | bcrypt hash |
| created_at | Date | Auto | |
| updated_at | Date | Auto | |

```javascript
import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  store_name: { type: String, required: true },
  location: { type: String, required: true },
  owner_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Planned fields:
  // phone: { type: String, default: '' },
  // currency: { type: String, default: 'USD' },
  // tax_rate: { type: Number, default: 0, min: 0, max: 100 },
  // logo_url: { type: String, default: '' },
  // is_active: { type: Boolean, default: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.password; // never expose
      return ret;
    },
  },
});

export default mongoose.model('Store', storeSchema);
```

**Relationships:** Parent of all tenant data. One store has many products, employees, sales, etc.

---

### 2.2 `products` ✅

**File:** `server/src/models/products.js`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| store_id | ObjectId → Store | Yes | Tenant scope |
| name | String | Yes | |
| sku | String | Yes | Unique per store |
| description | String | No | Default `''` |
| selling_price | Number | Yes | Default `0` |
| cost_price | Number | Yes | Default `0` |
| unit | String | Yes | piece, kg, liter, pack, box |
| total_quantity | Number | No | Consider moving to `inventory` |
| barcode | String | No | Scanner support |
| is_active | Boolean | No | Default `true` |
| created_at | Date | Auto | |
| updated_at | Date | Auto | |

```javascript
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true,
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  selling_price: { type: Number, required: true, default: 0, min: 0 },
  cost_price: { type: Number, required: true, default: 0, min: 0 },
  unit: {
    type: String,
    required: true,
    default: 'piece',
    enum: ['piece', 'kg', 'liter', 'pack', 'box'],
  },
  total_quantity: { type: Number, default: 0, min: 0 },
  barcode: { type: String, default: '' },
  image_url: { type: String, default: '' },
  min_stock_level: { type: Number, default: 0, min: 0 },
  is_active: { type: Boolean, default: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

productSchema.index({ store_id: 1, sku: 1 }, { unique: true });
productSchema.index({ store_id: 1, barcode: 1 }, { sparse: true });

export default mongoose.model('Product', productSchema);
```

**Relationships:**
- `store_id` → `stores` (many products per store)
- `category_id` → `categories` (optional)
- Referenced by `inventory`, `sale_items`, `purchase_order_items`

---

### 2.3 `employees` ✅

**File:** `server/src/models/employee.js`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| store_id | ObjectId → Store | Yes | Tenant scope |
| first_name | String | Yes | |
| last_name | String | Yes | |
| email | String | Yes | Unique per store |
| phone | String | Yes | |
| role | String | Yes | manager, cashier, staff, etc. |
| department | String | Yes | general, sales, finance, etc. |
| hire_date | Date | Yes | |
| salary | Number | Yes | |
| created_at | Date | Auto | |
| updated_at | Date | Auto | |

```javascript
import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true,
  },
  first_name: { type: String, required: true, trim: true },
  last_name: { type: String, required: true, trim: true, default: '' },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true, default: '' },
  role: {
    type: String,
    required: true,
    enum: ['manager', 'cashier', 'staff', 'accountant', 'warehouse'],
  },
  department: {
    type: String,
    required: true,
    default: 'general',
    enum: ['general', 'sales', 'finance', 'warehouse', 'management'],
  },
  hire_date: { type: Date, required: true, default: Date.now },
  salary: { type: Number, required: true, default: 0, min: 0 },
  is_active: { type: Boolean, default: true }, // add to existing model
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

employeeSchema.index({ store_id: 1, email: 1 }, { unique: true });

export default mongoose.model('Employee', employeeSchema);
```

**Relationships:**
- `store_id` → `stores`
- One employee may have zero or one `salesmen` record
- Referenced as `cashier_id` on sales

---

## 3. Planned Schemas (MVP)

These are required to replace mocked frontend data and enable POS sales.

### 3.1 `inventory` 📋

**Suggested file:** `server/src/models/inventory.js`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| store_id | ObjectId → Store | Yes | |
| product_id | ObjectId → Product | Yes | Unique per store |
| quantity | Number | Yes | Current stock |
| min_stock_level | Number | No | Alert threshold |
| reserved_quantity | Number | No | Open carts / holds |
| last_restocked_at | Date | No | |

```javascript
import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true,
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  min_stock_level: { type: Number, default: 0, min: 0 },
  reserved_quantity: { type: Number, default: 0, min: 0 },
  last_restocked_at: { type: Date, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

inventorySchema.index({ store_id: 1, product_id: 1 }, { unique: true });
inventorySchema.virtual('available_quantity').get(function () {
  return Math.max(0, this.quantity - (this.reserved_quantity || 0));
});

export default mongoose.model('Inventory', inventorySchema);
```

**Relationships:** 1:1 with `products` per store.

---

### 3.2 `inventory_transactions` 📋

**Suggested file:** `server/src/models/inventoryTransaction.js`

| Field | Type | Notes |
|-------|------|-------|
| store_id | ObjectId | Tenant |
| product_id | ObjectId | |
| type | Enum | sale, restock, adjustment, return, damage |
| quantity_change | Number | Positive or negative |
| quantity_before | Number | Snapshot |
| quantity_after | Number | Snapshot |
| reference_id | ObjectId | sale_id or PO id |
| note | String | Required for adjustments |
| created_by | ObjectId | employee or store owner |

```javascript
import mongoose from 'mongoose';

const inventoryTransactionSchema = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true,
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['sale', 'restock', 'adjustment', 'return', 'damage'],
  },
  quantity_change: { type: Number, required: true },
  quantity_before: { type: Number, required: true },
  quantity_after: { type: Number, required: true },
  reference_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  reference_type: {
    type: String,
    enum: ['sale', 'purchase_order', 'manual', null],
    default: null,
  },
  note: { type: String, default: '' },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false },
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

inventoryTransactionSchema.index({ store_id: 1, created_at: -1 });

export default mongoose.model('InventoryTransaction', inventoryTransactionSchema);
```

---

### 3.3 `salesmen` 📋

**Suggested file:** `server/src/models/salesman.js`

| Field | Type | Notes |
|-------|------|-------|
| store_id | ObjectId | Tenant |
| employee_id | ObjectId | Unique per store |
| commission_rate | Number | Percentage e.g. 5.0 |
| target_monthly | Number | Sales target |
| total_sales | Number | Cached aggregate |
| region | String | |
| is_active | Boolean | |

```javascript
import mongoose from 'mongoose';

const salesmanSchema = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true,
  },
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  commission_rate: { type: Number, required: true, default: 0, min: 0, max: 100 },
  target_monthly: { type: Number, default: 0, min: 0 },
  total_sales: { type: Number, default: 0, min: 0 },
  region: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

salesmanSchema.index({ store_id: 1, employee_id: 1 }, { unique: true });

export default mongoose.model('Salesman', salesmanSchema);
```

**Relationships:**
- `employee_id` → `employees` (1:0..1)
- Referenced by `sales.salesman_id`

---

### 3.4 `sales` 📋

**Suggested file:** `server/src/models/sale.js`

| Field | Type | Notes |
|-------|------|-------|
| store_id | ObjectId | Tenant |
| invoice_number | String | Auto-generated per store |
| salesman_id | ObjectId | Nullable |
| cashier_id | ObjectId | Employee who processed |
| customer_name | String | Optional walk-in |
| customer_phone | String | Optional |
| subtotal | Number | Sum of line items |
| discount | Number | |
| discount_type | Enum | flat, percent |
| tax | Number | |
| final_amount | Number | subtotal − discount + tax |
| payment_method | Enum | cash, card, upi, bank_transfer, mixed |
| payment_status | Enum | paid, partial, refunded |
| status | Enum | completed, cancelled, refunded |
| notes | String | |

```javascript
import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true,
  },
  invoice_number: { type: String, required: true },
  salesman_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salesman',
    default: null,
  },
  cashier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null,
  },
  customer_name: { type: String, default: '' },
  customer_phone: { type: String, default: '' },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  discount_type: {
    type: String,
    enum: ['flat', 'percent'],
    default: 'flat',
  },
  tax: { type: Number, default: 0, min: 0 },
  final_amount: { type: Number, required: true, min: 0 },
  payment_method: {
    type: String,
    required: true,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'mixed'],
    default: 'cash',
  },
  payment_status: {
    type: String,
    enum: ['paid', 'partial', 'refunded'],
    default: 'paid',
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    default: 'completed',
  },
  notes: { type: String, default: '' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

saleSchema.index({ store_id: 1, invoice_number: 1 }, { unique: true });
saleSchema.index({ store_id: 1, created_at: -1 });
saleSchema.index({ store_id: 1, salesman_id: 1 });

export default mongoose.model('Sale', saleSchema);
```

---

### 3.5 `sale_items` 📋

**Suggested file:** `server/src/models/saleItem.js`

Snapshot fields preserve historical accuracy when product prices change later.

| Field | Type | Notes |
|-------|------|-------|
| sale_id | ObjectId | Parent sale |
| product_id | ObjectId | |
| product_name | String | Snapshot |
| quantity | Number | |
| unit_price | Number | Price at time of sale |
| cost_price | Number | For profit reports |
| total_price | Number | quantity × unit_price |

```javascript
import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  sale_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true,
    index: true,
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  product_name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true, min: 0 },
  cost_price: { type: Number, required: true, min: 0 },
  total_price: { type: Number, required: true, min: 0 },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false },
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

saleItemSchema.index({ sale_id: 1, product_id: 1 });

export default mongoose.model('SaleItem', saleItemSchema);
```

---

## 4. Planned Schemas (Growth)

### 4.1 `categories` 📋

```javascript
const categorySchema = new mongoose.Schema({
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true, trim: true },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  sort_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

categorySchema.index({ store_id: 1, name: 1 });
```

---

### 4.2 `suppliers` 📋

```javascript
const supplierSchema = new mongoose.Schema({
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true },
  contact_person: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
```

---

### 4.3 `purchase_orders` + `purchase_order_items` 📋

```javascript
const purchaseOrderSchema = new mongoose.Schema({
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  po_number: { type: String, required: true },
  status: { type: String, enum: ['draft', 'ordered', 'received', 'cancelled'], default: 'draft' },
  subtotal: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  received_at: { type: Date, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const purchaseOrderItemSchema = new mongoose.Schema({
  purchase_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity_ordered: { type: Number, required: true, min: 1 },
  quantity_received: { type: Number, default: 0, min: 0 },
  unit_cost: { type: Number, required: true, min: 0 },
  total_cost: { type: Number, required: true, min: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
```

---

### 4.4 `customers` 📋

```javascript
const customerSchema = new mongoose.Schema({
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  loyalty_points: { type: Number, default: 0 },
  total_spent: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

customerSchema.index({ store_id: 1, phone: 1 }, { sparse: true });
```

---

### 4.5 `store_memberships` 📋 (multi-user)

```javascript
const storeMembershipSchema = new mongoose.Schema({
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'manager', 'cashier', 'warehouse', 'accountant'], required: true },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

storeMembershipSchema.index({ store_id: 1, user_id: 1 }, { unique: true });
```

---

### 4.6 `audit_logs` 📋

```javascript
const auditLogSchema = new mongoose.Schema({
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true }, // create, update, delete, login
  entity: { type: String, required: true },  // product, sale, employee
  entity_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  ip_address: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

auditLogSchema.index({ store_id: 1, created_at: -1 });
```

---

## 5. Indexes

| Collection | Index | Type | Purpose |
|------------|-------|------|---------|
| stores | `{ email: 1 }` | Unique | Login |
| products | `{ store_id: 1, sku: 1 }` | Unique | No duplicate SKU per store |
| products | `{ store_id: 1, barcode: 1 }` | Sparse | Barcode lookup |
| employees | `{ store_id: 1, email: 1 }` | Unique | No duplicate email per store |
| inventory | `{ store_id: 1, product_id: 1 }` | Unique | One stock record per product |
| salesmen | `{ store_id: 1, employee_id: 1 }` | Unique | One salesman per employee |
| sales | `{ store_id: 1, invoice_number: 1 }` | Unique | Sequential invoices |
| sales | `{ store_id: 1, created_at: -1 }` | | Dashboard / reports |

---

## 6. Relationship Reference

| Parent | Child | Cardinality | FK Field |
|--------|-------|-------------|----------|
| stores | products | 1:N | `products.store_id` |
| stores | employees | 1:N | `employees.store_id` |
| stores | sales | 1:N | `sales.store_id` |
| stores | inventory | 1:N | `inventory.store_id` |
| products | inventory | 1:1 | `inventory.product_id` |
| products | sale_items | 1:N | `sale_items.product_id` |
| employees | salesmen | 1:0..1 | `salesmen.employee_id` |
| salesmen | sales | 1:N | `sales.salesman_id` |
| sales | sale_items | 1:N | `sale_items.sale_id` |
| products | inventory_transactions | 1:N | `inventory_transactions.product_id` |
| sales | inventory_transactions | 1:N | `inventory_transactions.reference_id` |
| categories | products | 1:N | `products.category_id` |
| suppliers | purchase_orders | 1:N | `purchase_orders.supplier_id` |

---

## 7. Transaction Patterns

### 7.1 Complete a sale (atomic)

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. Validate stock for each cart item
  // 2. Create Sale document
  // 3. Create SaleItem documents
  // 4. Decrement Inventory (conditional update per item)
  // 5. Create InventoryTransaction per item
  // 6. Increment Salesman.total_sales if salesman assigned
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

### 7.2 Conditional inventory decrement

```javascript
const updated = await Inventory.findOneAndUpdate(
  { store_id, product_id, quantity: { $gte: qty } },
  { $inc: { quantity: -qty } },
  { new: true, session },
);
if (!updated) throw new Error('Insufficient stock');
```

### 7.3 Invoice number generation

```javascript
// Use a counter collection or find max invoice per store
const lastSale = await Sale.findOne({ store_id })
  .sort({ created_at: -1 })
  .select('invoice_number')
  .session(session);

const nextNum = parseInvoiceNumber(lastSale?.invoice_number) + 1;
const invoice_number = `INV-${year}-${String(nextNum).padStart(5, '0')}`;
```

### 7.4 Product creation → auto-create inventory

When a product is created, also create an `inventory` record with `quantity: 0` and `min_stock_level` from product defaults.

---

## Related Docs

- [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) — Full feature list, API checklist, and launch plan
