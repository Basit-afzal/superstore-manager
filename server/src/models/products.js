import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  selling_price: {
    type: Number,
    required: true,
    default: 0,
  },
  cost_price: {
    type: Number,
    required: true,
    default: 0,
  },
  unit: {
    type: String,
    required: true,
    default: 'piece',
  },
  total_quantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  min_stock_level: {
    type: Number,
    default: 10,
    min: 0,
  },
  last_restocked_at: {
    type: Date,
    default: null,
  },
  barcode: {
    type: String,
    default: '',
  },
  is_active: {
    type: Boolean,
    default: true,
  },
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

const Product = mongoose.model('Product', productSchema);

export default Product;
