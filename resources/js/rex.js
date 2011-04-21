// Global objects:
// TODO(fcarriedo): Refactor this objects out of the global scope.
var convoreUrl = 'https://convore.com';

// The convoreApi object
var convoreApi;
// user context object. Holds information such as username, user image,
// usr url, etc.
var userCxt; // Global variable that holds the logged user information.

/** ======================================
 *   Convore chrome utils
 *  ======================================
 */
function openInConvore(relativePath) {
  var url = convoreUrl + relativePath;
  // TODO(fcarriedo): Search open tabs, open in existing 'convore' (if).
  openInNewTab(url);
}

/** ======================================
 *   General utils
 *  ======================================
 */

function openInNewTab(url) {
  chrome.tabs.create({url: url}, function(tab) {});
}

var linkUtils = function() {

  // TODO(fcarriedo): Should we capture www.domain.com as URLs also? regex: ((http(s?):\/\/|www\.)[^\s"'*`\[\]()<>{}]+([^\s\.!?"'*`\[\]()<>{}]))
  // URLs regex.
  var urlRegex = /(http(s?):\/\/[^\s"'*`\[\]()<>{}]+([^\s\.!?"'*`\[\]()<>{}]))/gi;
  // User handle regex.
  var usrHandleRegex = /@([a-z]|[0-9]|[_])+/gi;

  return {

    /* Linkifys URLs and user passwords. */
    linkify: function(str) {
      var matchArray;

      // Linkify all URLs.
      var urls = [];
      while( (matchArray = urlRegex.exec(str) ) != null ) {
        urls.push( matchArray[0] );
      }
      for( var i=0; i<urls.length; i++ ) {
        str = str.replace(urls[i], "<a href='#' onClick=\"openInNewTab('" + urls[i] + "')\">" + urls[i] + "</a>");
      }

      // Linkify all user handles (eg. @username)
      var usrHandles = [];
      while( (matchArray = usrHandleRegex.exec(str) ) != null ) {
        usrHandles.push( matchArray[0] );
      }
      for( var i=0; i<usrHandles.length; i++ ) {
        var convoreUsrPath = '/users/' + usrHandles[i].substring(1);
        str = str.replace(new RegExp(usrHandles[i], 'gi'), "<a href='#' onClick=\"openInConvore('" + convoreUsrPath + "')\">" + usrHandles[i] + "</a>");
      }

      return str;
    }
  };
}();

/** ======================================
 *   Authentication
 *  ======================================
 */

/**
 * Method that everyone has to call to verify if the user
 * is correctly logged in and to initialize the global convore API
 * object with the correct credentials and the global userCtx.
 *
 * If the credentials object is undefined, I will try to get
 * the credentials from the datastore.
 * If no credentials exist in the datastore, 'onErrorCallback' will be
 * called.
 */
function verifyAccount(onSuccessCallback, onErrorCallback, newCreds) {
  var authCtx = !newCreds ? retrieveCredentials() : newCreds;

  if(!authCtx) {
    onErrorCallback.call();
  } else {
    convoreApi = new ConvoreAPI(authCtx);
    convoreApi.verifyAccount(
      function(usrDetails) {
        userCtx = usrDetails;
        persistCredentials(authCtx.username, authCtx.password);
        onSuccessCallback.call();
      },
      function(err) {
        convoreApi = null;
        userCtx = null;
        removeCredentials();
        onErrorCallback.call();
      }
    );
  }
}

function authenticate(creds, onSuccessCallback, onErrorCallback) {
  verifyAccount(onSuccessCallback, onErrorCallback, creds);
}

function doLogout() {
  removeCredentials();
  userCtx = null;
  convoreApi = null;
}

function retrieveCredentials() {
  var auth = datastore.get('convore.auth');
  if( auth ) {
    var authParts = auth.split(':');
    var usr = authParts[0];
    var pswd = authParts[1];

    return {username: usr, password: pswd};
  }
}

function removeCredentials() {
  datastore.delete('convore.auth');
}

function persistCredentials(username, password) {
  datastore.save('convore.auth', username + ':' + password);
}


/** ======================================
 *   Persistence abstraction
*    (implemented on localStorage)
 *  ======================================
 */

var datastore = function(storage) {
  return {
    get: function(key) {
      return storage.getItem(key);
    },
    save: function(key, value) {
      storage.setItem(key, value);
    },
    delete: function(key) {
      storage.removeItem(key);
    }
  };
}(localStorage);

/** ======================================
 *   Notification utils
 *  ======================================
 */

function showSimpleNotification(url, title, body) {
  var notification = webkitNotifications.createNotification('resources/images/rex.png', title, body);
  notification.onClick = openInConvore(url);
  notification.show();
  setTimeout(function(){ notification.cancel(); }, 15000);
}

/** ======================================
 *   Chrome extension utils
 *  ======================================
 */

function getPopupView() {
  return chrome.extension.getViews({type:'popup'})[0];
}

function getBackgroundPage() {
  return chrome.extension.getBackgroundPage();
}

/* Since there seems that there is no way to get the badge text,
*  we're going to have to manage the badge state by ourselves.
*/
var badgeUtils = function() {
  var badgeText = '';

  // TODO(fcarriedo): Customize badge background color.
  //chrome.browserAction.setBadgeBackgroundColor({color: [255, 0, 0, 100]});

  function setBadgeText( txt ) {
    chrome.browserAction.setBadgeText({text: badgeText});
  }

  function clearBadgeText( ) {
    chrome.browserAction.setBadgeText({text: ''});
  }

  return {
    addUnreadMention: function() {
      if( badgeText !== '@|m' ) {
        if(badgeText === '') {
          badgeText = '@';
        }else if(badgeText === 'm') {
          badgeText = '@|m';
        }

        setBadgeText( badgeText );
      }
    },
    addUnreadPrivateMessage: function() {
      if( badgeText !== '@|m' ) {
        if(badgeText === '') {
          badgeText = 'm';
        }else if(badgeText === '@') {
          badgeText = '@|m';
        }

        setBadgeText( badgeText );
      }
    },
    clearBadge: function() {
      clearBadgeText();
    }
  };
}();
