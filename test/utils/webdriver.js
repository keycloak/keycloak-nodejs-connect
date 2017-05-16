var phantomjs = require('phantomjs-prebuilt');
var webdriver = require('selenium-webdriver');
var By = webdriver.By;

var driver = new webdriver.Builder()
  .withCapabilities({'phantomjs.binary.path': phantomjs.path})
  .forBrowser('phantomjs')
  .build();

function ConsolePage () {}

ConsolePage.prototype.logInButton = function logInButton () {
  return driver.findElement(By.xpath("//button[text() = 'Login']"));
};

ConsolePage.prototype.output = function () {
  return driver.findElement(By.id('output'));
};

ConsolePage.prototype.logOutButton = () => {
  return driver.findElement(By.xpath("//button[text() = 'Logout']"));
};

ConsolePage.prototype.events = function () {
  return driver.findElement(By.id('events'));
};

ConsolePage.prototype.login = function (user, pass) {
  var username = driver.findElement(By.id('username'));
  username.clear();
  username.sendKeys(user);

  var password = driver.findElement(By.id('password'));
  password.clear();
  password.sendKeys(pass);

  driver.findElement(By.name('login')).click();
};

ConsolePage.prototype.body = () => {
  return driver.findElement(By.tagName('pre'));
};

module.exports = {
  driver: driver,
  webdriver: webdriver,
  ConsolePage: new ConsolePage()
};
