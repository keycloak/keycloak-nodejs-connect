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
//const {Capabilities} = require('selenium-webdriver');

const args = require('minimist')(process.argv.slice(2));
const By = webdriver.By;
const until = webdriver.until;
const fs = require('fs');
// const util = require('util');

function determineChromedriverPath () {
  let path = args.chromedriverPath || process.env.CHROMEDRIVER_PATH;

  if (!path) {
    const chromedriver = require('chromedriver');
    path = chromedriver.path;
  }

  // uncomment when debugging webdriver, comment out when running tap tests
  // console.log('Using chromedriver from path: ' + path);
  return path;
}
class WebDriverAccessClass {

  constructor() {
    // console.log(`createDriver start`);
    chrome.setDefaultService(new chrome.ServiceBuilder(determineChromedriverPath()).build());

    let o = new chrome.Options();
    o.addArguments('disable-infobars');
    o.addArguments('headless');
    o.addArguments('--window-size=1920,1080');

    if (args.chromeArguments) {
      let chromeArgs = args.chromeArguments.split(' ');
      console.log('Using additional chrome arguments [' + chromeArgs + ']');
      o.addArguments(chromeArgs);
    }

    o.setUserPreferences({ credential_enable_service: false });
    
    // The following line needs "selenium-webdriver": "^4.0.0-beta.3", NOT 3.6 series!!!!!
    // const caps = new Capabilities();
    // caps.setPageLoadStrategy("normal");    
    // Capabilities.PageLoadStrategy.NORMAL - This will make Selenium WebDriver to wait for the entire page is loaded.
    //          When set to normal, Selenium WebDriver waits until the load event fire is returned.

    this.driver = new webdriver.Builder()
      .setChromeOptions(o)
      // .withCapabilities(caps)
      .forBrowser('chrome')
      .build();

    // uncomment when debugging webdriver, comment out when running tap tests
    // this.driver.getCapabilities()
    // .then((caps) => {
    //   console.log('Chrome browser version: ' + caps.get('version'));
    //   console.log('Chromedriver version: ' + caps.get('chrome').chromedriverVersion);
    //   console.log('Page Load Strategy : ' + caps.get('pageLoadStrategy'));
    //   console.log('Platform Name : ' + caps.get('platformName'));
    //   console.log('Timeouts : ' + JSON.stringify(caps.get('timeouts')));
    // })
  }

  
  /* eslint-disable no-unused-vars */
  waitForElement (locator, t) {
    var timeout = t || 3000;
    return this.driver.wait(until.elementLocated(locator), timeout);
  }
  
  /* eslint-disable no-unused-vars */
  waitForVisibleElement (locator, t) {
    var timeout = t || 3000;
    var element = this.driver.wait(until.elementLocated(locator), timeout);
    return this.driver.wait(new webdriver.WebElementCondition('for element to be visible ' + locator, function () {
      return element.isDisplayed()
      .then(x => {
  
        if (x) {
          return element;
        }
  
        // this.driver.getPageSource()
        // .then((pageSource) => {
        //   this.driver.getCurrentUrl()
        //   .then((url) => {
        //     if( pageSource.indexOf('locator') >= 0) {
        //       console.log(`Page ${url} contains "${locator}".`);
        //     } else {
        //       console.error(`Page ${url} does NOT contain "${locator}".`);
        //     }
        //   });
        // });
      
        return (null);
      });
    }), timeout);
  }

  getEventsElement () {
    this.waitForVisibleElement(By.id('events'), 10000);
    return this.driver.findElement(By.id('events'));
  }

  getPage (port, resource) {
    resource = resource || '';
    return this.driver.get(`http://localhost:${port}${resource}`)
    .catch(error => {
      console.error(`ERROR: ConsolePage.prototype.get - ${error}`)
    });
  }

  getLoginButtonElement () {
    return this.driver.getPageSource()
    .then((pageSource) => {
      return this.driver.getCurrentUrl()
      .then( (url) => {
        if( pageSource.indexOf('LoginButton') >= 0) {
//          console.log(`Page ${url} contains "LoginButton".`);
        } else {
          console.error(`Page ${url} does NOT contain "LoginButton".`);
        }
      })
      .then( () => {
        return this.waitForVisibleElement(By.id('LoginButton'), 10000)
        .then(() => {
          return this.driver.findElement(By.id('LoginButton'))
        });
      });
    });
  }

  getOutputElement () {
    this.waitForVisibleElement(By.id('output'), 10000);
    return this.driver.findElement(By.id('output'));
  }

  getlogOutButtonElement ()  {
    this.waitForVisibleElement(By.id('LogoutButton'), 10000);
    return this.driver.findElement(By.id('LogoutButton'));
  }

  printPageSource () {
    this.driver.getPageSource().then((page) => {
      console.log(page);
    });
  }

  getPageSource () {
    return this.driver.getPageSource();
  }

  getgrantedResourceElement () {
    this.waitForVisibleElement(By.id('GrantedResource'), 10000);
    return this.driver.findElement(By.id('GrantedResource'));
  }

  login (user, pass) {
    return this.driver.getPageSource()
    .then((pageSource) => {
      return this.driver.getCurrentUrl()
      .then((url) => {
        if( pageSource.indexOf('username') >= 0) {
//          console.log(`Page ${url} contains "username".`);
        } else {
          console.error(`Page ${url} does NOT contain "username".`);
        }
        if( pageSource.indexOf('password') >= 0) {
//          console.log(`Page ${url} contains "password".`);
        } else { 
          console.error(`Page ${url} does NOT contain "password".`);
        }
        if( pageSource.indexOf('kc-login') >= 0) {
//          console.log(`Page ${url} contains "kc-login".`);
        } else {
          console.error(`Page ${url} does NOT contain "kc-login".`);
        }
      })
    })
    .then( () => {
      return  this.waitForVisibleElement(By.id('username'), 10000)
      .then(() => {
        return this.driver.findElement(By.id('username'));
      })
      .then(webElement => {
        return webElement.clear()
      .then(() => {
          return webElement.sendKeys(user);
        })
      })
    })
    .then( () => {
      return this.waitForVisibleElement(By.id('password'), 10000)
      .then(() => {
        return this.driver.findElement(By.id('password'))
      })
      .then(webElement => {
        return webElement.clear()
        .then(() => {
          return webElement.sendKeys(pass);
        })
      })
    })
    .then( () => {
      return this.waitForVisibleElement(By.id('kc-login'), 10000)
      .then(() => {
        return this.driver.findElement(By.id('kc-login'))
      })
      .then(webElement => {
        return webElement.click()
      });
    })
  }
  /**
   * Logouts directly with support for a wait period
   *
   * @param port
   * @returns {Promise<any>}
   */
  logout (port) {
    this.getPage(port, '/logout');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }

  getBodyElement () {
    // waitForVisibleElement(By.tagName('pre'), 5000);
    return this.driver.findElement(By.tagName('pre'));
  }

  geth1Element () {
    return this.driver.getPageSource()
    .then((pageSource) => {
      return this.driver.getCurrentUrl()
      .then( (url) => {
        if( pageSource.indexOf('h1') >= 0) {
//          console.log(`Page ${url} contains "h1".`);
        } else {
          console.error(`Page ${url} does NOT contain "h1".`);
        }
      })
      .then( () => {
        return this.waitForVisibleElement(By.tagName('h1'), 10000)
        .then(() => {
          return this.driver.findElement(By.tagName('h1'))
        });
      });
    });
  }

  getCurrentUrl () {
    return this.driver.getCurrentUrl()
  }

  getAccountPage (realm, port ) {
    return this.driver.get(this.getAccoutUrl(realm, port ));
  }

  getAccoutUrl (realm, port) {
    port = port || '8080';
    realm = realm || 'UnitTesting-test-realm';

    return `http://127.0.0.1:${port}/auth/realms/${realm}/account/`;
  }

  accountLandingPageSignInButtonClick () {
      return this.driver.getPageSource()
    .then((pageSource) => {
      return this.driver.getCurrentUrl()
      .then((url) => {
        if( pageSource.indexOf('landingSignInButton') >= 0) {
//          console.log(`Page ${url} contains "landingSignInButton".`);
        } else {
          console.error(`Page ${url} does NOT contain "landingSignInButton".`);
        }
      })
    })
    .then(() => {
      return this.waitForVisibleElement(By.id('landingSignInButton'), 10000)
      .then(() => {
        return this.driver.findElement(By.id('landingSignInButton'))
        .then(webElement => {
          return webElement.click()
        });
      });
    });
  }

  accountLandingPagesignOutButtonClick () {
    return this.driver.getPageSource()
    .then((pageSource) => {
      this.driver.getCurrentUrl()
      .then((url) => {
        if( pageSource.indexOf('landingSignOutButton') >= 0) {
          const element  = this.driver.findElement(By.id('landingSignOutButton'));
          if (element.isDisplayed) {
            if (element.isEnabled) {
//              console.log(`Page ${url} contains "landingSignOutButton" and is displayed and enabled.`);
            } else {
              console.log(`Page ${url} contains "landingSignOutButton" and is displayed, but is not enabled.`);
            }
          } else {
            console.log(`Page ${url} contains "landingSignOutButton" , but is not displayed.`);
          }
        } else {
          console.error(`Page ${url} does NOT contain "landingSignOutButton".`);
        }
      })
      .then(() => {
        const webElement  = this.driver.findElement(By.id('landingSignOutButton'));
        if ((webElement.isDisplayed) && (webElement.isEnabled)) {
          return webElement.click();
        } else {
          return this.waitForVisibleElement(By.id('landingSignOutButton'), 10000)
          .then( () => {
            return this.driver.findElement(By.id('landingSignOutButton'))
            .then(webElement => {
              return webElement.click()
            });
          });
        }
      });
    });
  }

  refreshPage () {
    return this.driver.getCurrentUrl()
    .then((url) => {
      return this.driver.get(url);
    });
  }

  takeScreenshot(file) {
    return this.driver.takeScreenshot()
      .then(image => {
        fs.writeFileSync(file, image, 'base64')
      });
  }

  async destroy () {
    // console.log("Driver destroy!");
    return await this.driver.manage().deleteAllCookies()
    .then(async () => {
      return await this.driver.quit();
    })
  }
}

var webdriveraccessClass = new WebDriverAccessClass();

module.exports = webdriveraccessClass;
