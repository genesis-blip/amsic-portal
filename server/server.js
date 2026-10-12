require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { addHolidays } = require('./seed/add-holidays');

const PORT = process.env.PORT || 5050;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Add a long random value to server/.env (see .env.example).');
  process.exit(1);
}

connectDB()
  .then(() => addHolidays().catch((err) => console.warn('Could not add holidays:', err.message)))
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
      const pm = process.env.PAYMONGO_SECRET_KEY || '';
      console.log(`SMS (Semaphore): ${process.env.SEMAPHORE_API_KEY ? `on, log in codes ${process.env.LOGIN_OTP === 'on' ? 'on' : 'off'}, status texts ${process.env.SMS_STATUS_UPDATES === 'on' ? 'on' : 'off'}` : 'off'}`);
      console.log(`Online payment (PayMongo): ${pm.startsWith('sk_live_') ? 'LIVE' : pm.startsWith('sk_test_') ? 'test mode' : 'off'}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
