import Department, { IDepartment } from '../models/Department';

// Get all departments
export const getAllDepartments = async (): Promise<IDepartment[]> => {
  try {
    return await Department.find().sort({ name: 1 });
  } catch (error: any) {
    throw new Error(`Error fetching departments: ${error.message}`);
  }
};

// Get department by ID
export const getDepartmentById = async (id: string): Promise<IDepartment | null> => {
  try {
    const department = await Department.findById(id);
    return department;
  } catch (error: any) {
    throw new Error(`Error fetching department: ${error.message}`);
  }
};

// Get department by name
export const getDepartmentByName = async (name: string): Promise<IDepartment | null> => {
  try {
    const department = await Department.findOne({ name });
    return department;
  } catch (error: any) {
    throw new Error(`Error fetching department by name: ${error.message}`);
  }
};

// Create new department
export const createDepartment = async (departmentData: { name: string, description?: string }): Promise<IDepartment> => {
  try {
    const department = new Department(departmentData);
    return await department.save();
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error('Department with this name already exists');
    }
    throw new Error(`Error creating department: ${error.message}`);
  }
};

// Update department
export const updateDepartment = async (id: string, departmentData: { name?: string, description?: string }): Promise<IDepartment | null> => {
  try {
    const department = await Department.findByIdAndUpdate(
      id, 
      departmentData, 
      { new: true, runValidators: true }
    );
    return department;
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error('Department with this name already exists');
    }
    throw new Error(`Error updating department: ${error.message}`);
  }
};

// Delete department
export const deleteDepartment = async (id: string): Promise<IDepartment | null> => {
  try {
    const department = await Department.findByIdAndDelete(id);
    return department;
  } catch (error: any) {
    throw new Error(`Error deleting department: ${error.message}`);
  }
}; 