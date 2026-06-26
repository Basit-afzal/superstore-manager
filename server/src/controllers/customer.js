import Customer from '../models/customer.js';
import Sale from '../models/sale.js';

function attachSaleStats(customers, sales) {
  return customers.map((customer) => {
    const customerJson = customer.toJSON ? customer.toJSON() : customer;
    const name = customerJson.name?.trim().toLowerCase();
    const phone = customerJson.phone?.trim();

    const matchingSales = sales.filter((sale) => {
      const saleName = sale.customer_name?.trim().toLowerCase();
      const salePhone = sale.customer_phone?.trim();

      if (phone && salePhone) {
        return phone === salePhone;
      }

      return name && saleName === name;
    });

    return {
      ...customerJson,
      total_orders: matchingSales.length,
      total_spent: matchingSales.reduce(
        (sum, sale) => sum + (Number(sale.final_amount) || 0),
        0,
      ),
    };
  });
}

export const getAllCustomers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const { search } = req.query;

    const filter = { store_id: req.store };

    if (search?.trim()) {
      const term = search.trim();
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ];
    }

    const [customers, total, sales] = await Promise.all([
      Customer.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(filter),
      Sale.find({ store_id: req.store }).select('customer_name customer_phone final_amount'),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({
      customers: attachSaleStats(customers, sales),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch customers' });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, notes, is_active } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    const customer = await Customer.create({
      store_id: req.store,
      name: name.trim(),
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      notes: notes?.trim() || '',
      is_active: is_active ?? true,
    });

    return res.status(201).json(customer);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Failed to create customer' });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { name, phone, email, notes, is_active } = req.body;

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, store_id: req.store },
      {
        name: name?.trim(),
        phone: phone?.trim() || '',
        email: email?.trim() || '',
        notes: notes?.trim() || '',
        is_active,
      },
      { new: true, runValidators: true },
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json(customer);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Failed to update customer' });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      store_id: req.store,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete customer' });
  }
};

export async function upsertCustomerFromSale(storeId, name, phone) {
  const trimmedName = name?.trim();
  if (!trimmedName || trimmedName.toLowerCase() === 'walk-in') {
    return;
  }

  const trimmedPhone = phone?.trim() || '';
  const filter = { store_id: storeId, name: trimmedName };

  if (trimmedPhone) {
    filter.phone = trimmedPhone;
  }

  const existing = await Customer.findOne(filter);
  if (existing) {
    return existing;
  }

  return Customer.create({
    store_id: storeId,
    name: trimmedName,
    phone: trimmedPhone,
    is_active: true,
  });
}
