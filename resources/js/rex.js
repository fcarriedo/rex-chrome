var convoreUrl = 'https://convore.com';
var convoreApiUrl = 'https://convore.com/api';

function initRex() {
  checkCredentials();
}

function checkCredentials() {
  var popupView = getPopupView();
  if(popupView) {
    var authContext = retrieveCredentials();
    if( !authContext ) {
      popupView.showLoginPage();
    } else {
      popupView.showFeed();
    }
  }
}

function setupGlobalCreds(convoreUsr, convorePswd) {
  // Set usr/pswd for general ajax calls.
  $.ajaxSetup({
    username: convoreUsr,
    password: convorePswd
  });

  // Persist creds in the localStorage
  persistCredentials(convoreUsr, convorePswd);
}


function retrieveCredentials() {
  var auth = localStorage.getItem('convore.auth');
  if( !auth ) {
    var popupView = getPopupView();
    if( popupView ) {
      popupView.showLoginPage();
    }
  } else {
    var authParts = auth.split(':');
    var usr = authParts[0];
    var pswd = authParts[1];

    var authContext = {
      username: usr,
      password: pswd,
      success: null,
      error: null
    };

    return authContext;
  }
}


function validateCredentials(authContext) {
  var verifyAccountUrl = convoreApiUrl + '/account/verify.json';
  $.ajax({
    url: verifyAccountUrl,
    headers: {
      Authorization: 'Basic ' + btoa(authContext.username + ':' + authContext.password)
    },
    success: function(data) {
      if( !data.error ) {
        setupGlobalCreds(authContext.username, authContext.password);
        if(authContext.success) {
          authContext.success.call();
        }
      } else {
        if(authContext.error) {
          authContext.error.call();
        }
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      if(authContext.error) {
        authContext.error.call();
      }
      console.log('error: ' + errorThrown);
    }
  });
}

function fetchGroups( callback ) {
  var url = convoreApiUrl + '/groups.json';
  $.getJSON(url, function(data) {
    callback.call(this, data.groups );
  });
}

function openInConvore(relativePath) {
  var url = convoreUrl + relativePath;
  chrome.tabs.create({url: url}, function(tab) {});
}

function removeCredentials() {
  localStorage.removeItem('convore.auth');
}

function persistCredentials(username, password) {
  localStorage.setItem('convore.auth', username + ':' + password);
}

function getPopupView() {
  return chrome.extension.getViews({type:'popup'})[0];
}

function getBackgroundPage() {
  return chrome.extension.getBackgroundPage();
}
