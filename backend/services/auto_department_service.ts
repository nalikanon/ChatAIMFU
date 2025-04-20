import { getDepartmentByName, createDepartment } from './department_service';

/**
 * Ensure that a department exists by name.
 * If it doesn't exist, create it automatically.
 * @param departmentName The name of the department
 * @returns Boolean indicating if a new department was created
 */
export const ensureDepartmentExists = async (departmentName: string): Promise<boolean> => {
  // Skip if department name is empty or not provided
  if (!departmentName || departmentName.trim() === '') {
    return false;
  }
  
  try {
    // Check if department already exists
    const existingDepartment = await getDepartmentByName(departmentName);
    
    if (existingDepartment) {
      // Department already exists, no need to create
      return false;
    }
    
    // Department doesn't exist, create it
    await createDepartment({
      name: departmentName,
      description: `Automatically created department for ${departmentName}`
    });
    
    console.log(`Automatically created department: ${departmentName}`);
    return true;
  } catch (error) {
    console.error(`Error ensuring department exists: ${error}`);
    return false;
  }
}; 