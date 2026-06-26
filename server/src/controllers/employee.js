import Employee from '../models/employee.js';

export const getAllEmployee = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const { search, role, department } = req.query;

    const filter = { store_id: req.store };

    if (search?.trim()) {
      const term = search.trim();
      filter.$or = [
        { first_name: { $regex: term, $options: 'i' } },
        { last_name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
      ];
    }

    if (role?.trim()) {
      filter.role = role.trim();
    }

    if (department?.trim()) {
      filter.department = department.trim();
    }

    const [employees, total] = await Promise.all([
      Employee.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit),
      Employee.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({
      employees,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch employees' });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      role,
      department,
      hire_date,
      salary,
    } = req.body;

    if (!first_name?.trim() || !email?.trim() || !role?.trim()) {
      return res.status(400).json({
        message: 'first_name, email, and role are required',
      });
    }

    const existing = await Employee.findOne({
      email: email.trim(),
      store_id: req.store,
    });

    if (existing) {
      return res.status(409).json({
        message: 'Employee already exists with this email',
      });
    }

    const employee = await Employee.create({
      first_name: first_name.trim(),
      last_name: last_name?.trim() || '',
      email: email.trim(),
      phone: phone?.trim() || '',
      role: role.trim(),
      department: department?.trim() || 'general',
      hire_date: hire_date || new Date(),
      salary: Number(salary) || 0,
      store_id: req.store,
    });

    return res.status(201).json(employee);
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Failed to create employee',
    });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, role, department, hire_date, salary } = req.body;
    const employee = await Employee.findOneAndUpdate(
      { _id: id, store_id: req.store },
      { first_name, last_name, email, phone, role, department, hire_date, salary },
      { new: true, runValidators: true },
    );
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    return res.status(200).json(employee);
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Failed to update employee',
    });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findOneAndDelete({ _id: id, store_id: req.store });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    return res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete employee' });
  }
};
