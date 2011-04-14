var convoreUrl = 'https://convore.com';
var convoreApiUrl = 'https://convore.com/api';

function initRex() {
  checkCredentials();
}


/** ======================================
 *   Convore API
 *    TODO: (Put this into a separate lib)
 *  ======================================
 */
function fetchGroups( callback ) {
  var url = convoreApiUrl + '/groups.json';
  $.getJSON(url, function(data) {
    callback.call(this, data.groups );
  });
}

function fetchTopics(groupId, callback) {
  var url = convoreApiUrl + '/groups/' + groupId + '/topics.json';
  $.getJSON(url, function(data) {
    callback.call(this, data.topics );
  });
}

function fetchMessages(topicId, callback) {
  var url = convoreApiUrl + '/topics/' + topicId + '/messages.json';
  $.getJSON(url, function(data) {
    callback.call(this, data.messages );
  });
}

function listenToLiveFeed( callback ) {
  var url = convoreApiUrl + '/live.json';
  $.getJSON(url, function(data) {
    callback.call(this, data.messages);
    // Calls itself again ad infinitum. (Long polling encouraged [see api docs]).
    setTimeout(function() { listenToLiveFeed(callback); }, 0);
  });
}

/** ======================================
 *   Convore chrome utils
 *  ======================================
 */
function openInConvore(relativePath) {
  var url = convoreUrl + relativePath;
  chrome.tabs.create({url: url}, function(tab) {});
}


/** ======================================
 *   Authentication
 *  ======================================
 */

function checkCredentials() {
  var popupView = getPopupView();
  if(popupView) {
    var authCtx = retrieveCredentials();
    if( !authCtx ) {
      popupView.showLoginPage();
    } else {
      popupView.showFeed();
    }
  }
}

function validateCredentials(authCtx) {
  var verifyAccountUrl = convoreApiUrl + '/account/verify.json';
  $.ajax({
    url: verifyAccountUrl,
    headers: {
      Authorization: 'Basic ' + btoa(authCtx.username + ':' + authCtx.password)
    },
    success: function(data) {
      if( !data.error ) {
        persistCredentials(authCtx.username, authCtx.password);
        setupGlobalCreds(authCtx.username, authCtx.password);
        if(authCtx.success) {
          authCtx.success.call();
        }
      } else {
        if(authCtx.error) {
          authCtx.error.call();
        }
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      if(authCtx.error) {
        authCtx.error.call();
      }
      console.log('error: ' + errorThrown);
    }
  });
}

function retrieveCredentials() {
  var auth = datastore.get('convore.auth');
  if( !auth ) {
    var popupView = getPopupView();
    if( popupView ) {
      popupView.showLoginPage();
    }
  } else {
    var authParts = auth.split(':');
    var usr = authParts[0];
    var pswd = authParts[1];

    var authCtx = {
      username: usr,
      password: pswd,
      success: null,
      error: null
    };

    return authCtx;
  }
}

function removeCredentials() {
  datastore.delete('convore.auth');
}

function persistCredentials(username, password) {
  datastore.save('convore.auth', username + ':' + password);
}

function setupGlobalCreds(convoreUsr, convorePswd) {
  // Set usr/pswd for general ajax calls.
  $.ajaxSetup({
    username: convoreUsr,
    password: convorePswd
  });
}

function getUsername() {
  var auth = datastore.get('convore.auth');
  if( auth ) {
    return auth.split(':')[0];
  }
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

function showSimpleNotification(title, body) {
  var notification = webkitNotifications.createNotification('resources/images/rex.png', title, body);
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
