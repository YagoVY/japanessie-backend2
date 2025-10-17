const express = require('express');
const app = express();

app.use((req, res, next) => {
  console.log('📨 Request:', req.method, req.path);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server works' });
});

app.get('/webhooks/test', (req, res) => {
  console.log('✅ WEBHOOK TEST HIT');
  res.json({ message: 'Webhook test works!', timestamp: new Date().toISOString() });
});

app.post('/webhooks/shopify/orders/created', (req, res) => {
  console.log('✅ WEBHOOK POST HIT');
  res.json({ message: 'Webhook received!' });
});

app.all('*', (req, res) => {
  console.log('❌ 404:', req.method, req.path);
  res.status(404).json({ error: 'Not found', path: req.path });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Test server running on port ${PORT}`);
});

