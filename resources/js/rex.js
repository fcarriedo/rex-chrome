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

function fetchGroupTopics(groupId, callback) {
  var url = convoreApiUrl + '/groups/' + groupId + '/topics.json';
  $.getJSON(url, function(data) {
    callback.call(this, data.topics );
  });
}

function fetchTopicMessages(topicId, callback) {
  var url = convoreApiUrl + '/topics/' + topicId + '/messages.json';
  $.getJSON(url, function(data) {
    callback.call(this, data.messages );
  });
}

/* Fetches a list of direct message conversations for the current user*/
function fetchConversations() {
  var url = convoreApiUrl + '/messages.json';
  $.getJSON(url, function(data) {
    callback.call(this, data.conversations );
  });
}

function fetchMentions(callback) {
  var url = convoreApiUrl + '/account/mentions.json';
  $.getJSON(url, function(data) {
    callback.call(this, data.mentions, data.unread );
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

function checkCredentials() {
  var popupView = getPopupView();
  if(popupView) {
    var authCtx = retrieveCredentials();
    if( !authCtx ) {
      popupView.showLoginPage();
    } else {
      popupView.showMainPane();
    }
  }
}

function validateCredentials(authCtx) {
  var verifyAccountUrl = convoreApiUrl + '/account/verify.json';
  $.ajax({
    url: verifyAccountUrl,
    username: authCtx.username,
    password: authCtx.password,
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
