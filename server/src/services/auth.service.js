import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const signToken = (payload) => {
  try {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
  } catch (error) {
    throw new Error('Failed to sign token: ' + error.message);
  }
};

export const verifyStoreToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token: ' + error.message);
  }
};
