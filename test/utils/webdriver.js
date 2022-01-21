/*
 * Copyright 2016 Red Hat Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
'use strict';
/**
 * An utility with the specifics for selenium
 */
const chrome = require('selenium-webdriver/chrome');
const webdriver = require('selenium-webdriver');
const args = require('minimist')(process.argv.slice(2));
const By = webdriver.By;
const until = webdriver.until;
const driver = createDriver();

function createDriver () {
  chrome.setDefaultService(new chrome.ServiceBuilder(determineChromedriverPath()).build());

  const o = new chrome.Options();
  o.addArguments('disable-infobars');
  o.addArguments('headless');

  if (args.chromeArguments) {
    const chromeArgs = args.chromeArguments.split(' ');
    console.log('Using additional chrome arguments [' + chromeArgs + ']');
    o.addArguments(chromeArgs);
  }

  o.setUserPreferences({ credential_enable_service: false });

  const driver = new webdriver.Builder()
    .setChromeOptions(o)
    .forBrowser('chrome')
    .build();

  driver.getCapabilities().then((caps) => {
    console.log('Chrome browser version: ' + caps.get('version'));
    console.log('Chromedriver version: ' + caps.get('chrome').chromedriverVersion);
  });

  return driver;
}

function determineChromedriverPath () {
  let path = args.chromedriverPath || process.env.CHROMEDRIVER_PATH;

  if (!path) {
    const chromedriver = require('chromedriver');
    path = chromedriver.path;
  }

  console.log('Using chromedriver from path: ' + path);
  return path;
}

/* eslint-disable no-unused-vars */
function waitForElement (locator, t) {
  const timeout = t || 3000;
  return driver.wait(until.elementLocated(locator), timeout);
}

/* eslint-disable no-unused-vars */
function waitForVisibleElement (locator, t) {
  const timeout = t || 3000;
  const element = driver.wait(until.elementLocated(locator), timeout);
  return driver.wait(new webdriver.WebElementCondition('for element to be visible ' + locator, function () {
    return element.isDisplayed().then(x => x ? element : null);
  }), timeout);
}

function ConsolePage () {}

ConsolePage.prototype.get = function (port, resource) {
  resource = resource || '';
  return driver.get(`http://localhost:${port}${resource}`);
};

ConsolePage.prototype.quit = function () {
  driver.manage().deleteAllCookies();
  driver.quit();
};

ConsolePage.prototype.logInButton = function () {
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

ConsolePage.prototype.print = function () {
  driver.getPageSource().then((page) => {
    console.log(page);
  });
};

ConsolePage.prototype.grantedResourceButton = function () {
  return driver.findElement(By.xpath("//button[text() = 'Granted Resource']"));
};

ConsolePage.prototype.login = function (user, pass) {
  waitForVisibleElement(By.id('username'), 100000);
  const username = driver.findElement(By.id('username'));
  username.clear();
  username.sendKeys(user);

  const password = driver.findElement(By.id('password'));
  password.clear();
  password.sendKeys(pass);

  return driver.findElement(By.name('login')).then(webElement => webElement.click());
};

/**
 * Logouts directly with support for a wait period
 *
 * @param port
 * @returns {Promise<any>}
 */
ConsolePage.prototype.logout = function (port) {
  this.get(port, '/logout');
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 2000);
  });
};

ConsolePage.prototype.body = () => {
  return driver.findElement(By.tagName('pre'));
};

ConsolePage.prototype.h1 = () => {
  return driver.findElement(By.tagName('h1'));
};

const newPage = new ConsolePage();

function RealmAccountPage () {}

RealmAccountPage.prototype.get = function (port, realm) {
  return driver.get(this.getUrl(port, realm));
};

RealmAccountPage.prototype.getUrl = function (port, realm) {
  port = port || '8080';
  realm = realm || 'test-realm';

  return `http://127.0.0.1:${port}/auth/realms/${realm}/account`;
};

RealmAccountPage.prototype.logout = function () {
  return driver.findElement(By.linkText('Sign Out')).then(webElement => webElement.click());
};

const realmAccountPage = new RealmAccountPage();

module.exports = {
  driver: driver,
  webdriver: webdriver,
  newPage: newPage,
  realmAccountPage: realmAccountPage
};
