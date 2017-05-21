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
const phantomjs = require('phantomjs-prebuilt');
const webdriver = require('selenium-webdriver');
const By = webdriver.By;
const until = webdriver.until;

const driver = new webdriver.Builder()
  .withCapabilities({'phantomjs.binary.path': phantomjs.path})
  .forBrowser('phantomjs')
  .build();

/* eslint-disable no-unused-vars */
function waitForElement (locator, t) {
  var timeout = t || 3000;
  return driver.wait(until.elementLocated(locator), timeout);
}

/* eslint-disable no-unused-vars */
function waitForVisibleElement (locator, t) {
  var timeout = t || 3000;
  var element = driver.wait(until.elementLocated(locator), timeout);
  return driver.wait(new until.WebElementCondition('for element to be visible ' + locator, function () {
    return element.isDisplayed().then(x => x ? element : null);
  }), timeout);
}

function ConsolePage () {}

ConsolePage.prototype.get = function (port, resource) {
  resource = resource || '';
  driver.get(`http://localhost:${port}${resource}`);
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

ConsolePage.prototype.login = function (user, pass) {
  waitForVisibleElement(By.id('username'), 100000);
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

var newPage = new ConsolePage();

module.exports = {
  driver: driver,
  webdriver: webdriver,
  newPage: newPage
};
