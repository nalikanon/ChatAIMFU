// import { Router, RequestHandler } from 'express';
// import jwt from 'jsonwebtoken';
// import { connectDB } from '../../lib/mongodb.js';
// import User from '../../models/User.js';

// const router = Router();

// const googleAuthHandler: RequestHandler = async (req, res): Promise<void> => {
//   try {
//     const { token } = req.body;

//     // ตรวจสอบ token กับ Google
//     const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
//       headers: { Authorization: `Bearer ${token}` },
//     });

//     if (!response.ok) {
//       throw new Error('Failed to fetch user');
//     }

//     const userData = await response.json();

//     const allowedDomains = process.env.GOOGLE_ALLOWED_DOMAINS?.split(',') || [];

//     // ฟังก์ชันสำหรับตรวจสอบโดเมน
//     const isAllowedDomain = (email: string) => {
//       return allowedDomains.some(domain => email.endsWith('@' + domain));
//     };

//     // ใช้ในการตรวจสอบ
//     if (!isAllowedDomain(userData.email)) {
//       res.status(401).json({ 
//         message: 'กรุณาใช้อีเมลของมหาวิทยาลัยแม่ฟ้าหลวงในการเข้าสู่ระบบ' 
//       });
//       return;
//     }

//     // เชื่อมต่อ MongoDB
//     await connectDB();

//     // ค้นหาหรือสร้างผู้ใช้ใหม่
//     let user = await User.findOne({ email: userData.email });
//     if (!user) {
//       user = await User.create({
//         email: userData.email,
//         name: userData.name,
//         picture: userData.picture,
//         googleId: userData.sub,
//       });
//     }

//     // สร้าง JWT token
//     const authToken = jwt.sign(
//       { userId: user._id, email: user.email },
//       process.env.JWT_SECRET!,
//       { expiresIn: '7d' }
//     );

//     res.status(200).json({ token: authToken });
//   } catch (error) {
//     console.error('Authentication error:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

// router.post('/google', googleAuthHandler);

// export default router; 