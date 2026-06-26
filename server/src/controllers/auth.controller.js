import bcrypt from 'bcrypt';
import Store from '../models/store.js';
import { signToken } from '../services/auth.service.js';

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const store = await Store.findOne({ email });
  if (!store) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordMatch = await bcrypt.compare(password, store.password);
  if (!passwordMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken({ storeId: store._id });
  return res.status(200).json({
    user: {
      id: store.id,
      name: store.owner_name,
      email: store.email,
      location: store.location,
      role: 'owner',
    },
    token,
    store: {
      id: store.id,
      name: store.store_name,
      location: store.location,
      owner_name: store.owner_name,
      profile_image: store.profile_image || '',
      role: 'owner',
    },
  });
};

export const logout = async (_req, res) => {
  return res.status(200).json({ message: 'Logged out successfully' });
};

export const getMe = async (req, res) => {
  const store = await Store.findById(req.store);
  if (!store) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.status(200).json({
    id: store.id,
    name: store.owner_name,
    email: store.email,
  });
};
