import { z } from 'zod';

export const PRODUCT_UNITS = ['piece', 'kg', 'liter', 'pack', 'box'] as const;

export const productFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Product name must be at least 2 characters')
      .max(100, 'Product name must be at most 100 characters'),
    sku: z
      .string()
      .trim()
      .min(1, 'SKU is required')
      .max(50, 'SKU must be at most 50 characters')
      .regex(
        /^[a-zA-Z0-9-_]+$/,
        'SKU can only contain letters, numbers, hyphens, and underscores',
      ),
    description: z.string().max(500, 'Description must be at most 500 characters'),
    selling_price: z.coerce
      .number({ invalid_type_error: 'Enter a valid selling price' })
      .min(0, 'Selling price cannot be negative'),
    cost_price: z.coerce
      .number({ invalid_type_error: 'Enter a valid cost price' })
      .min(0, 'Cost price cannot be negative'),
    unit: z.enum(PRODUCT_UNITS, {
      errorMap: () => ({ message: 'Select a valid unit' }),
    }),
    barcode: z.string().max(50, 'Barcode must be at most 50 characters'),
    total_quantity: z.coerce
      .number({ invalid_type_error: 'Enter a valid stock quantity' })
      .int('Stock must be a whole number')
      .min(0, 'Stock cannot be negative'),
    min_stock_level: z.coerce
      .number({ invalid_type_error: 'Enter a valid alert level' })
      .int('Alert level must be a whole number')
      .min(0, 'Alert level cannot be negative'),
  })
  .refine((data) => data.selling_price >= data.cost_price, {
    message: 'Selling price must be greater than or equal to cost price',
    path: ['selling_price'],
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const productFormDefaults: ProductFormValues = {
  name: '',
  sku: '',
  description: '',
  selling_price: 0,
  cost_price: 0,
  unit: 'piece',
  barcode: '',
  total_quantity: 0,
  min_stock_level: 10,
};
