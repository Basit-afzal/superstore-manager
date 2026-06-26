import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import Store from '../models/store.js';
import { signToken } from '../services/auth.service.js';
import { profileImagesDir } from '../middleware/upload.middleware.js';

function formatStore(store) {
  return {
    id: store.id,
    name: store.store_name,
    location: store.location,
    owner_name: store.owner_name,
    profile_image: store.profile_image || '',
    role: 'owner',
  };
}

function deleteProfileImageFile(profileImagePath) {
  if (!profileImagePath?.startsWith('/uploads/profile-images/')) {
    return;
  }

  const filename = path.basename(profileImagePath);
  const filePath = path.join(profileImagesDir, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export const registerStore = async (req, res) => {
  const {
    storeName,
    storeLocation,
    ownerName,
    email,
    password,
  } = req.body;

  if (!storeName || !ownerName || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const existingStore = await Store.findOne({ email });
  if (existingStore) {
    return res.status(400).json({ message: 'Email already in use' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const store = await Store.create({
    store_name: storeName,
    location: storeLocation || '',
    owner_name: ownerName,
    email,
    password: passwordHash,
  });

  const token = signToken({ storeId: store._id });

  return res.status(201).json({
    user: {
      id: store.id,
      name: store.owner_name,
      email: store.email,
    },
    token,
    store: formatStore(store),
  });
};

export const getMyStore = async (req, res) => {
  const store = await Store.findById(req.store);
  if (!store) {
    return res.status(404).json({ message: 'Store not found' });
  }

  return res.status(200).json(formatStore(store));
};

export const uploadProfileImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  const store = await Store.findById(req.store);
  if (!store) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ message: 'Store not found' });
  }

  deleteProfileImageFile(store.profile_image);

  store.profile_image = `/uploads/profile-images/${req.file.filename}`;
  await store.save();

  return res.status(200).json(formatStore(store));
};
