const path = require('path');

exports.getIndex = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
};
