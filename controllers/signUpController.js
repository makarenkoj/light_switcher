const path = require('path');

exports.getSignUpPage = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/signup.html'));
};

exports.getLoginPage = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login.html'));
};
