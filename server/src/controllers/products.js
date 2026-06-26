import Product from '../models/products.js';

export const getAllProducts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const { search, unit } = req.query;

    const filter = { store_id: req.store };

    if (search?.trim()) {
      const term = search.trim();
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { sku: { $regex: term, $options: 'i' } },
      ];
    }

    if (req.query.is_active !== undefined && req.query.is_active !== '') {
      filter.is_active = req.query.is_active === 'true' || req.query.is_active === true;
    }

    if (unit) {
      filter.unit = unit;
    }

    if (req.query.low_stock === 'true') {
      filter.$expr = { $lte: ['$total_quantity', '$min_stock_level'] };
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch products' });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, store_id: req.store });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(product);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch product' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      description,
      selling_price,
      cost_price,
      unit,
      barcode,
      is_active,
      total_quantity,
      min_stock_level,
    } = req.body;

    if (!name?.trim() || !sku?.trim()) {
      return res.status(400).json({ message: 'Name and SKU are required' });
    }

    const product = await Product.create({
      store_id: req.store,
      name: name.trim(),
      sku: sku.trim(),
      description: description || '',
      selling_price: Number(selling_price) || 0,
      cost_price: Number(cost_price) || 0,
      unit: unit || 'piece',
      barcode: barcode || '',
      is_active: is_active ?? true,
      total_quantity: Math.max(0, Number(total_quantity) || 0),
      min_stock_level: Math.max(0, Number(min_stock_level) ?? 10),
      last_restocked_at: Number(total_quantity) > 0 ? new Date() : null,
    });

    return res.status(201).json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Failed to create product' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      description,
      selling_price,
      cost_price,
      unit,
      barcode,
      is_active,
      total_quantity,
      min_stock_level,
    } = req.body;

    const updates = {
      name,
      sku,
      description,
      selling_price: Number(selling_price) || 0,
      cost_price: Number(cost_price) || 0,
      unit,
      barcode,
      is_active,
    };

    if (total_quantity !== undefined) {
      updates.total_quantity = Math.max(0, Number(total_quantity) || 0);
    }

    if (min_stock_level !== undefined) {
      updates.min_stock_level = Math.max(0, Number(min_stock_level) || 0);
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, store_id: req.store },
      updates,
      { new: true, runValidators: true },
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Failed to update product' });
  }
};

export const restockProduct = async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, store_id: req.store },
      {
        $inc: { total_quantity: quantity },
        $set: { last_restocked_at: new Date() },
      },
      { new: true, runValidators: true },
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Failed to restock product' });
  }
};

export const adjustProductStock = async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);
    const note = req.body.note?.trim();

    if (Number.isNaN(quantity)) {
      return res.status(400).json({ message: 'Quantity is required' });
    }

    if (!note) {
      return res.status(400).json({ message: 'A reason is required for stock adjustments' });
    }

    const product = await Product.findOne({ _id: req.params.id, store_id: req.store });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const newQuantity = product.total_quantity + quantity;
    if (newQuantity < 0) {
      return res.status(400).json({ message: 'Stock cannot go below 0' });
    }

    product.total_quantity = newQuantity;
    await product.save();

    return res.json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Failed to adjust stock' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete(
      { _id: req.params.id, store_id: req.store },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete product' });
  }
};

export const lowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({ store_id: req.store, total_quantity: { $lt: '$min_stock_level' } });
    console.log(products);
    return res.json(products);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch low stock products' });
  }
};
