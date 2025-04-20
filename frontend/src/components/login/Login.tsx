// import React,{useState} from 'react';
// import { useNavigate } from 'react-router-dom';
import { config } from '../../config/config';
// import axios from 'axios';
const Login: React.FC = () => {
  // const [showLogin, setShowLogin] = useState(false);
  // const [name, setName] = useState('');
  const handleMFUSSOLogin = () => {
    window.location.href = `${config.apiUrl}/api/auth/login/saml`;
  };

  const handleAdminLogin = () => {
    window.location.href = import.meta.env.VITE_ADMIN_LOGIN_URL;
  };

  // const navigator = useNavigate();
  // const login_guest =  async() =>  {
  //   try {
  //     if (!name) {
  //       alert('Please enter your name');
  //       return;
  //     }
  //     const response = await axios.post(`${config.apiUrl}/api/auth/test`, {nameID: name});
      
  //     if (response.status !== 200) {
  //       throw new Error('Error logging in as guest');
  //     }
  //     setShowLogin(false);
  //     navigator(response.data)
  //   }
  //     catch (error) {
  //       console.error(error);
  //     }
  // }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center relative" 
      style={{ backgroundImage: "url('/mfu_background_login.jpg')" }}>
      <div className="absolute inset-0 bg-white/50"></div>
      <div className="max-w-md w-full space-y-8 p-8 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg relative z-10">
        <div className="text-center">
          <img src="/mfu_logo_chatbot.PNG" alt="MFU Logo" className="mx-auto h-24 w-auto mb-4" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Login to <span style={{ 
              background: 'linear-gradient(to right, rgb(186, 12, 47), rgb(212, 175, 55))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>DIN</span>DIN <span style={{
              background: 'linear-gradient(to right, #00FFFF, #0099FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>AI</span>
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please login with your MFU account
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Your 24/7 AI Assistant for Mae Fah Luang University
          </p>
        </div>
        <div className="mt-8">
          <button
            onClick={handleMFUSSOLogin}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Login with MFU SSO
          </button>
          <div className="mt-2 text-right">
            <button 
              onClick={handleAdminLogin}
              className="text-xs text-gray-500 hover:text-black underline px-1 py-0.5 transition-colors duration-200"
            >
              admin login
            </button>
          </div>
        </div> 
        {/* <div className="mt-8">
          <button
            onClick={() => setShowLogin(true)}
            className='w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          >
            Login with guest
          </button>
        </div> */}

      </div>
      {/* {showLogin && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center transition-opacity">
          <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Login as Guest
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please enter your name
              </p>
            </div>
            <div className="mt-8">
              <input
                type="text"
                placeholder="Your Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="mt-8">
              <button
                onClick={() => login_guest()}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default Login; 