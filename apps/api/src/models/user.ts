import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    emailNormalized: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'staff'], default: 'staff', required: true },
    active: { type: Boolean, default: true, required: true },
    preferences: { pageSize: { type: Number, enum: [10, 20, 50, 100], default: 20 } },
  },
  { timestamps: true },
);
export const User = model('User', schema);
