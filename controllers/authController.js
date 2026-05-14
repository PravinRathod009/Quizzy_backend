const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET="sdflkdfkldsjfkldsj"
const JWT_EXPIRES_IN="7d"

const signToken = (id) =>
  jwt.sign({ id },
  JWT_SECRET,
 {expiresIn:'7d'}
 );

exports.register = async (req, res) => {
  try {
    const { name, email, password, adminCode } = req.body;
    console.log("name",name)
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });
    const exists = await User.findOne({ email });
    console.log("exists",exists)
    if (exists) return res.status(409).json({ error: 'Email already registered.' });
    const role = adminCode && adminCode === process.env.ADME ? 'admin' : 'user';
    const user = await User.create({ name, email, password, role });
    console.log("user",user)
    const token = signToken(user._id);
    console.log("token",token)
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log(err.message)
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400)
    .json({
       error: 'Email and password are required.'
       });

    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password)))  
      return res.status(401).json({ error: 'Invalid email or password.' });
    if (!user.isActive)
      return res.status(403).json({ error: 'Account is disabled. Contact admin.' });
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    const token = signToken(user._id);
    console.log("res",token,user)
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};
