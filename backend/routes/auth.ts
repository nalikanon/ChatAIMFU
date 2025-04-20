import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';
import jwt from 'jsonwebtoken';
import { connectDB } from '../lib/mongodb';
import User from '../models/User';
// import { guest_login } from '../controllers/user_controller';
import bcrypt from 'bcrypt';
import fs from 'fs';
import { JWT_SECRET } from '../config/config';
import { guest_login } from '../controllers/user_controller';
import { ensureDepartmentExists } from '../services/auto_department_service';

const router = Router();

// เพิ่ม logging middleware
router.use('/saml/callback', (req, res, next) => {
  // console.log('SAML Callback Request:', req.body);
  next();
});

const samlStrategy = new SamlStrategy(
  {
    issuer: process.env.SAML_SP_ENTITY_ID,
    callbackUrl: process.env.SAML_SP_ACS_URL,
    entryPoint: process.env.SAML_IDP_SSO_URL,
    logoutUrl: process.env.SAML_IDP_SLO_URL,
    cert: process.env.SAML_CERTIFICATE || '',
    disableRequestedAuthnContext: true,
    forceAuthn: false,
    identifierFormat: null,
    wantAssertionsSigned: true,
    acceptedClockSkewMs: -1,
    validateInResponseTo: false,
    passReqToCallback: true
  },
  async function(req: any, profile: any, done: any) {
    try {
      // console.log('=== SAML Profile Debug ===');
      // console.log(JSON.stringify(profile, null, 2));

      // ปรับการอ่านค่าให้ตรงกับ SAML response
      const nameID = profile.nameID;
      const username = profile['User.Userrname'];
      const email = profile['User.Email'];
      const firstName = profile['first_name'];
      const lastName = profile['last_name'];
      const department = profile['depart_name']?.toLowerCase() || '';
      const groups = profile['http://schemas.xmlsoap.org/claims/Group'] || [];

      console.log('=== Extracted Values ===');
      console.log({
        nameID,
        username,
        email,
        firstName,
        lastName,
        department,
        groups
      });

      if (!nameID) {
        console.error('Missing required fields:', { nameID });
        return done(new Error('Missing required user information'));
      }

      // if (!nameID || !email) {
      //   console.error('Missing required fields:', { nameID, email });
      //   return done(new Error('Missing required user information'));
      // }

       // เพิ่มฟังก์ชันแปลง group เป็น role
       const mapGroupToRole = (groups: string[]) => {
        const isStudent = groups.some(group => 
          group === 'S-1-5-21-893890582-1041674030-1199480097-43779'
        );
        return isStudent ? 'Students' : 'Staffs';
      };

      // Ensure the department exists in our database if it's provided
      if (department) {
        await ensureDepartmentExists(department);
      }

      const user = await User.findOneAndUpdate(
        { username },
        {
          nameID,
          username,
          email,
          firstName,
          lastName,
          department,
          groups: Array.isArray(groups) ? groups : [groups],
          role: mapGroupToRole(Array.isArray(groups) ? groups : [groups]),
          updated: new Date()
        },
        { upsert: true, new: true }
      );

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      const userData = {
        nameID: user.nameID,
        username: user.username,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        depart_name: user.department,
        groups: user.groups
      };

      return done(null, { token, userData });

    } catch (error) {
      console.error('SAML Strategy Error:', error);
      return done(error);
    }
  }
);

passport.use(samlStrategy);

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

router.get('/login/saml', passport.authenticate('saml'));

router.post('/saml/callback',
  passport.authenticate('saml', { session: false }),
  async (req: any, res) => {
    try {
      const mapGroupToRole = (groups: string[]) => {
        const isStudent = groups.some(group => 
          group === 'S-1-5-21-893890582-1041674030-1199480097-43779'
        );
        return isStudent ? 'Students' : 'Staffs';
      };

      const userData = {
        nameID: req.user.userData.nameID,
        username: req.user.userData.username,
        email: req.user.userData.email,
        firstName: req.user.userData.first_name,
        lastName: req.user.userData.last_name,
        department: req.user.userData.depart_name,
        groups: [mapGroupToRole(req.user.userData.groups || [])]
      };

      // Automatically create department if it doesn't exist
      if (userData.department) {
        await ensureDepartmentExists(userData.department);
      }

      const token = jwt.sign(
        { 
          nameID: userData.nameID,
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          department: userData.department,
          groups: userData.groups
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      const encodedUserData = Buffer.from(JSON.stringify(userData)).toString('base64');
      
      const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth-callback`);
      redirectUrl.searchParams.append('token', token);
      redirectUrl.searchParams.append('user_data', encodedUserData);

      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('SAML callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }
);

router.post('/logout', (req, res) => {
  req.logout(() => {
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect(process.env.SAML_IDP_SLO_URL || '/');
  });
});

router.get('/logout/saml', (req, res) => {
  req.logout(() => {
    // const frontendUrl = process.env.FRONTEND_URL || 'https://mfulearnai.mfu.ac.th';
    // const returnUrl = encodeURIComponent(`${frontendUrl}/login`);
    // const logoutUrl = `${process.env.SAML_IDP_SLO_URL}&wreply=${returnUrl}`;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const logoutUrl = `${process.env.SAML_IDP_SLO_URL}`;    
    res.redirect(logoutUrl);
  });
});

router.get('/metadata', (req, res) => {
  const metadata = samlStrategy.generateServiceProviderMetadata(null, process.env.SAML_CERTIFICATE);
  res.type('application/xml');
  res.send(metadata);
});

// router.post('/test', guest_login);

router.post('/saml/callback', (req, res, next) => {
  // console.log('=== SAML Callback Debug ===');
  // console.log('Headers:', req.headers);
  // console.log('Body:', req.body);
  // console.log('=========================');
  next();
});

router.post('/admin/login', async (req: Request, res: Response):Promise<void> => {
  try {
    const { username, password } = req.body;

    // ตรวจสอบว่ามีข้อมูลครบไหม
    if (!username || !password) {
      res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
      return;
    }

    const user = await User.findOne({ username, role: { $in: ['Admin', 'SuperAdmin'] } });
    if (!user) {
      res.status(401).json({ message: 'ไม่พบบัญชีผู้ใช้' });
      return;
    }
    // ใช้ method comparePassword ที่เราสร้างไว้ใน User model
    const isMatch = await (user as any).comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
      return;
    }

    // Ensure department exists if the admin has one assigned
    if (user.department) {
      await ensureDepartmentExists(user.department);
    }

    // สร้าง token
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department,
        role: user.role,
        groups: user.groups
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // ส่งข้อมูลกลับ
    res.json({ 
      token,
      user: {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department,
        role: user.role,
        groups: user.groups
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

export default router;