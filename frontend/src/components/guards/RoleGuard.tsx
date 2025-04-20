import { Navigate } from 'react-router-dom';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedGroups: string[];
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedGroups }) => {
  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  const userGroups = userData.groups || [];

  // console.log('RoleGuard Debug:', {
  //   userData,
  //   userGroups,
  //   allowedGroups
  // });

  // Case-insensitive comparison
  const hasAllowedGroup = userGroups.some((userGroup: string) => 
    allowedGroups.some(allowedGroup => {
      const match = allowedGroup.toLowerCase() === userGroup.toLowerCase();
      // console.log(`Comparing: ${userGroup} with ${allowedGroup}, match: ${match}`);
      return match;
    })
  );

  // console.log('Has allowed group:', hasAllowedGroup);

  if (!hasAllowedGroup) {
    // console.log('Access denied, redirecting to /mfuchatbot');
    return <Navigate to="/mfuchatbot" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard; 