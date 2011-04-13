var convoreUrl = 'https://convore.com';
var convoreApiUrl = 'https://convore.com/api';

function initRex() {
  checkCredentials();
}

function checkCredentials() {
}

function setupGlobalCreds(convoreUsr, convorePswd) {
  $.ajaxSetup({
    username: convoreUsr,
    password: convorePswd
  });
}

function getPopupView() {
  return chrome.extension.getViews({type:'popup'})[0];
}

function getBackgroundPage() {
  return chrome.extension.getBackgroundPage();
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

function persistCredentials(username, password) {
  localStorage.setItem('convore.auth', username + ':' + password);
}

function validateCredentials(authContext) {
  var verifyAccountUrl = convoreApiUrl + '/account/verify.json';
  $.ajax({
    url: verifyAccountUrl,
    headers: {
      Authorization: 'Basic ' + btoa(authContext.username + ':' + authContext.password)
    },
    success: function(data) {
      console.log(data);
      if( !data.error ) {
        setupGlobalCreds(authContext.username, authContext.password);
        persistCredentials(authContext.username, authContext.password);
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
