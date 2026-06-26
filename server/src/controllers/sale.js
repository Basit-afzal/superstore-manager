import Sale from '../models/sale.js';
import Product from '../models/products.js';
import { upsertCustomerFromSale } from './customer.js';
import { verifyStripePayment } from '../utils/verifyStripePayment.js';
import { isStripeConfigured } from '../services/stripe.service.js';

async function decrementStock(storeId, productId, quantity) {
  const updated = await Product.findOneAndUpdate(
    {
      _id: productId,
      store_id: storeId,
      is_active: true,
      total_quantity: { $gte: quantity },
    },
    { $inc: { total_quantity: -quantity } },
    { new: true },
  );

  return updated;
}

async function restoreStock(productId, quantity) {
  await Product.findByIdAndUpdate(productId, {
    $inc: { total_quantity: quantity },
  });
}

export const createSale = async (req, res) => {
  const stockUpdates = [];

  try {
    const {
      items,
      total_amount,
      discount,
      tax,
      final_amount,
      payment_method,
      status,
      customer_name,
      customer_phone,
      stripe_payment_intent_id,
    } = req.body;

    const resolvedPaymentMethod = payment_method || 'cod';

    if (resolvedPaymentMethod === 'stripe') {
      if (!isStripeConfigured()) {
        throw new Error('Stripe is not configured');
      }
      if (!stripe_payment_intent_id) {
        throw new Error('Stripe payment intent is required');
      }
      await verifyStripePayment(
        stripe_payment_intent_id,
        req.store,
        Number(final_amount) || 0,
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const saleItems = [];

    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!quantity || quantity <= 0) {
        throw new Error('Each item must have a quantity greater than 0');
      }

      const product = await Product.findOne({
        _id: item.product_id,
        store_id: req.store,
      });

      if (!product) {
        throw new Error('Product not found');
      }

      if (!product.is_active) {
        throw new Error(`${product.name} is inactive`);
      }

      if (product.total_quantity < quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const updated = await decrementStock(req.store, item.product_id, quantity);
      if (!updated) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      stockUpdates.push({ product_id: item.product_id, quantity });

      saleItems.push({
        product_id: product._id,
        name: product.name,
        sku: product.sku,
        quantity,
        unit_price: Number(item.unit_price) || product.selling_price,
        total_price: Number(item.total_price) || product.selling_price * quantity,
      });
    }

    const salePayload = {
      store_id: req.store,
      customer_name: customer_name?.trim() || 'Walk-in',
      customer_phone: customer_phone?.trim() || '',
      total_amount: Number(total_amount) || 0,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      final_amount: Number(final_amount) || 0,
      payment_method: resolvedPaymentMethod,
      status: status || 'completed',
      items: saleItems,
    };

    if (resolvedPaymentMethod === 'stripe') {
      salePayload.stripe_payment_intent_id = stripe_payment_intent_id;
    }

    const sale = await Sale.create(salePayload);

    await upsertCustomerFromSale(
      req.store,
      sale.customer_name,
      sale.customer_phone,
    );

    return res.status(201).json(sale);
  } catch (error) {
    await Promise.all(
      stockUpdates.map(({ product_id, quantity }) =>
        restoreStock(product_id, quantity),
      ),
    );

    return res.status(400).json({ message: error.message || 'Failed to create sale' });
  }
};

export const getSales = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;
    const sales = await Sale.find({ store_id: req.store })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Sale.countDocuments({ store_id: req.store });
    const totalPages = Math.ceil(total / limit);

    return res.json({ sales, pagination: { page, limit, total, totalPages } });

  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch sales' });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      store_id: req.store,
    });

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    return res.json(sale);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch sale' });
  }
};