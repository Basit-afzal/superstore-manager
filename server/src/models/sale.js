import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: { type: String, required: true },
  sku: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true, min: 0 },
  total_price: { type: Number, required: true, min: 0 },
});

const saleSchema = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true,
  },
  salesman_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salesman',
    default: null,
  },
  customer_name: {
    type: String,
    default: '',
    trim: true,
  },
  customer_phone: {
    type: String,
    default: '',
    trim: true,
  },
  total_amount: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  final_amount: { type: Number, required: true, min: 0 },
  payment_method: {
    type: String,
    enum: ['cod', 'card_on_delivery', 'stripe', 'cash', 'card', 'digital'],
    default: 'cod',
  },
  stripe_payment_intent_id: {
    type: String,
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    default: 'completed',
  },
  items: {
    type: [saleItemSchema],
    validate: [(v) => Array.isArray(v) && v.length > 0, 'At least one item is required'],
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

saleSchema.index({ store_id: 1, created_at: -1 });
saleSchema.index(
  { stripe_payment_intent_id: 1 },
  {
    unique: true,
    partialFilterExpression: {
      stripe_payment_intent_id: { $type: 'string' },
    },
  },
);

export default mongoose.model('Sale', saleSchema);
