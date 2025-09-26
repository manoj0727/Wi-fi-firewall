const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const { createDNSServer } = require('./dns-server');
const { RuleManager } = require('./rule-manager');
const apiRoutes = require('./routes/api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

const ruleManager = new RuleManager();

app.use('/api', apiRoutes(ruleManager));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const dnsServer = createDNSServer(ruleManager);

app.listen(PORT, () => {
  console.log(`Web server running on http://localhost:${PORT}`);
  console.log(`DNS server running on port ${process.env.DNS_PORT || 53}`);
  console.log('\nTo use this firewall:');
  console.log('1. Open http://localhost:3000 in your browser');
  console.log('2. Configure your device DNS to point to this machine\'s IP');
});