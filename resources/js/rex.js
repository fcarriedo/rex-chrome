// Global objects:
// TODO(fcarriedo): Refactor this objects out of the global scope.
var convoreUrl = 'https://convore.com';
var convoreUrlRegex = new RegExp('(^' + convoreUrl + ')', 'g');

// The convoreApi object
var convoreApi;

/** ======================================
 *   Convore chrome utils
 *  ======================================
 */
function openInConvore(relativePath) {
  var url = convoreUrl + relativePath;

  var tabsMode = datastore.get('settings.tabs.mode')  || 'open_in_existing_convore_tab';

  if( tabsMode === 'always_new_tab' ) {
    openInNewTab(url);
  } else {
    // Opening in existing convore tab (if exists).
    chrome.windows.getCurrent( function( currentWindow ) {
      chrome.tabs.getAllInWindow( currentWindow.id, function(tabs) {
        var openingTabId = -1;

        for (var i = 0; i < tabs.length; i++) {
          if( convoreUrlRegex.test( tabs[i].url ) ) {
            openingTabId = tabs[i].id;
          }
        }

        if( openingTabId > 0 ) {
          chrome.tabs.update( openingTabId , {url: url, selected: true}, function(tab) {} );
        } else {
          openInNewTab(url);
        }
      });
    });
  }
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
  // Images URLs regex.
  var imagesUrlRegex = /(http(s?):\/\/[^\s"'*`\[\]()<>{}]+(\.png|\.jpg|\.jpeg|\.gif))/gi;

  return {

    /* Linkifys URLs and user passwords. */
    linkify: function(str) {
      var matchArray;

      // We make a copy of the original str which we can use as a clean canvas if needed before any process modifies it.
      var origStr = str; 

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

      // Append an 'img' element to the string for every image found on the string.
      // Images will appear after the message.
      var imgLinks = [];
      while( (matchArray = imagesUrlRegex.exec(origStr) ) != null ) {
        imgLinks.push("<a href='#' onClick=\"openInNewTab('" + matchArray[0] + "')\"><img src='" + matchArray[0] + "'/></a>" );
      }
      if( imgLinks.length !== 0 ) {
        str += '<br/>' + imgLinks.join('<br/>')
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
        persistCredentials(authCtx.username, authCtx.password);
        onSuccessCallback.call(this, usrDetails);
      },
      function(err) {
        convoreApi = null;
        datastore.clear();
        onErrorCallback.call();
      }
    );
  }
}

function authenticate(creds, onSuccessCallback, onErrorCallback) {
  verifyAccount(onSuccessCallback, onErrorCallback, creds);
}

function doLogout() {
  datastore.clear();
  session.clear();
  convoreApi = null;
}

function retrieveCredentials() {
  var auth = datastore.get('convore.auth');
  if( auth ) {

    try {
      auth = atob( auth );
    } catch( err ) {
      datastore.clear();
      return null;
    }

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
  datastore.save('convore.auth', btoa( username+':'+password ) );
}

/** ======================================
*   Session utils
*   (supported by sessionStorage)
*  ======================================
*/

var session = function() {

  return {

    currentPane: function( pane ) {
      if( !pane ) {
        var currntPane = sessionStorage.getItem('currentPane');
        if( !currntPane ) {
          currentPane( panes.groups ); // If not set.. initialize it to groups.
          return panes.groups;
        } else {
          return currntPane;
        }
      } else {
        sessionStorage.setItem( 'currentPane', pane );
      }
    },

    selectedGroup: function( group ) {
      if( !group ) return JSON.parse( sessionStorage.getItem('selectedGroup') );
      sessionStorage.setItem( 'selectedGroup', JSON.stringify(group) );
    },

    selectedTopic: function( topic ) {
      if( !topic ) return JSON.parse( sessionStorage.getItem('selectedTopic') );
      sessionStorage.setItem( 'selectedTopic' , JSON.stringify(topic) );
    },

    userDetails: function( usrDetails ) {
      if( !usrDetails ) return JSON.parse( sessionStorage.getItem('userDetails') );
      sessionStorage.setItem( 'userDetails' , JSON.stringify(usrDetails) );
    },

    clear: function() {
      sessionStorage.clear();
    }
  };
}();

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
    },
    clear: function() {
      storage.clear();
    }
  };
}(localStorage);

/** ======================================
 *   Notification utils
 *  ======================================
 */

function showSimpleNotification(url, title, body) {
  var notificationsMode = datastore('settings.notifications.mode') || 'only_when_convore_window_unfocused';

  if( notificationsMode === 'always' ) {
    createNotification( url , title , body );
  } else if( notificationsMode === 'only_when_convore_window_unfocused' ) {
    chrome.windows.getCurrent( function( currentWindow ) {
      chrome.tabs.getSelected( currentWindow.id, function(tab) {
        if( !convoreUrlRegex.test( tab.url ) ) {
          createNotification( url, title, body);
        }
      });
    });
  } else {
    // The only remaining option is 'never' so it doesn't create a notification.
  }

}

function createNotification(url, title, body) {
  var notification = webkitNotifications.createNotification('resources/images/rex.png', title, body);
  notification.onclick = function() { openInConvore(url); };
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


/** ======================================
 *   Some jQuery utils
 *  ======================================
 */
// Helps to realize if the element is focused a la jQuery style: $(elem).is(':focus');
// See: https://gist.github.com/450017
jQuery.expr[':'].focus = function( elem ) {
  return elem === document.activeElement && ( elem.type || elem.href );
};

/** ======================================
 *   Timestamp formatting utils
 *  ======================================
 */
function toISODate( convoreTimestamp ) {
  var millis = Math.round( convoreTimestamp*1000 ); // Convert their timestamp to millis.
  return new Date( millis ).toISOString();
}
