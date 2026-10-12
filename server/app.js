const express = require('express');
const cors = require('cors');

const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', require('./routes/authRoutes'));
app.get('/api/verify/:referenceNumber', require('./controllers/certificateController').verify);
app.use('/api/me', require('./routes/meRoutes'));
app.use('/api/accounts', require('./routes/accountRoutes'));
app.use('/api/residents', require('./routes/residentRoutes'));
app.use('/api/document-types', require('./routes/documentTypeRoutes'));
app.use('/api/document-requests', require('./routes/documentRequestRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/incidents', require('./routes/incidentRoutes'));
app.use('/api/blotters', require('./routes/blotterRoutes'));
app.use('/api/sos-alerts', require('./routes/sosAlertRoutes'));
app.use('/api/bulletins', require('./routes/bulletinRoutes'));
app.use('/api/health-records', require('./routes/healthRecordRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
