import { z } from 'zod';

export const EMPLOYEE_ROLES = [
  'manager',
  'cashier',
  'staff',
  'accountant',
  'warehouse',
] as const;

export const EMPLOYEE_DEPARTMENTS = [
  'general',
  'sales',
  'finance',
  'warehouse',
  'management',
] as const;

const phoneRegex = /^[\d\s+\-()]{7,20}$/;

export const employeeFormSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be at most 50 characters'),
  last_name: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be at most 50 characters'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Enter a valid phone number'),
  role: z.enum(EMPLOYEE_ROLES, {
    errorMap: () => ({ message: 'Select a valid role' }),
  }),
  department: z.enum(EMPLOYEE_DEPARTMENTS, {
    errorMap: () => ({ message: 'Select a valid department' }),
  }),
  hire_date: z.string().min(1, 'Hire date is required'),
  salary: z.coerce
    .number({ invalid_type_error: 'Enter a valid salary' })
    .min(0, 'Salary cannot be negative'),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export const employeeFormDefaults: EmployeeFormValues = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'staff',
  department: 'general',
  hire_date: new Date().toISOString().split('T')[0],
  salary: 0,
};
