const path = require('path');

exports.getStatus = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/status.html'));
};
