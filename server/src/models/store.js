import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  store_name: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  owner_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profile_image: {
    type: String,
    default: '',
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

const Store = mongoose.model('Store', storeSchema);

export default Store;