import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userDataBase64 = searchParams.get('user_data');

    if (token && userDataBase64) {
      try {
        // แปลง base64 กลับเป็น JSON string
        const userDataStr = atob(userDataBase64);
        // แปลง JSON string เป็น object
        const userData = JSON.parse(userDataStr);

        // บันทึกข้อมูลลง localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(userData));

        // console.log('Saved token:', token);
        // console.log('Saved user data:', userData);

        // redirect ไปที่หน้า MFUChatbot
        navigate('/mfuchatbot');
      } catch (error) {
        console.error('Error processing auth data:', error);
        navigate('/login?error=invalid_data');
      }
    } else {
      console.error('Missing token or user data');
      navigate('/login?error=missing_data');
    }
  }, [navigate, searchParams]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังเข้าสู่ระบบ...</p>
      </div>
    </div>
  );
};

export default AuthCallback; 