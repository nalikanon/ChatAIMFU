import { useState } from 'react';

const Header = () => {
  // ดึงข้อมูลผู้ใช้จาก localStorage
  const userDataString = localStorage.getItem('user_data');
  const userData = userDataString ? JSON.parse(userDataString) : null;

  // เพิ่ม state สำหรับควบคุมการแสดง/ซ่อนป็อปอัพ
  const [showPopup, setShowPopup] = useState(false);

  // console.log('User data from localStorage:', userData); // เพิ่ม log เพื่อตรวจสอบข้อมูล

  return (
    <header className="w-full text-right">
      <nav className="flex items-center justify-between px-6 py-4 w-full text-right">
        <div className="ml-auto text-gray-600 dark:text-gray-300 relative">
          {userData && (
            <>
              <div 
                onClick={() => setShowPopup(!showPopup)}
                className="cursor-pointer px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span>
                  {/* {userData.username}  */}
                  {userData.firstName} {userData.lastName}
                </span>
              </div>

              {/* ป็อปอัพแสดงรายละเอียด */}
              {showPopup && (
                <div className="absolute right-0 mt-2 min-w-max max-w-xs bg-white dark:bg-gray-700 rounded-lg shadow-lg p-3 sm:p-4 z-50">
                  <div className="space-y-2 text-left">
                    <p className="text-xs sm:text-sm whitespace-nowrap"><span className="font-semibold">Name:</span> {userData.firstName} {userData.lastName}</p>
                    <p className="text-xs sm:text-sm whitespace-nowrap"><span className="font-semibold">ID:</span> {userData.username}</p>
                    <p className="text-xs sm:text-sm whitespace-nowrap"><span className="font-semibold">Email:</span> {userData.email}</p>
                    <p className="text-xs sm:text-sm whitespace-nowrap"><span className="font-semibold">Department:</span> {userData.department}</p>
                    <p className="text-xs sm:text-sm whitespace-nowrap"><span className="font-semibold">Group:</span> {userData.groups?.join(', ')}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
