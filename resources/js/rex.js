var convrBaseApiUrl = 'https://convore.com/api';
var convrUrl = 'https://convore.com';


function initRex() {
  // If auth creds not in local storage... login page and store.
  // Then load init page.
  checkCredentials();
  //loadInitContent();
}

function logout() {
  localStorage.removeItem('convore.auth');
  checkCredentials();
}

function checkCredentials() {
  var auth = localStorage.getItem('convore.auth');
  if(!auth) {
    chrome.browserAction.setPopup({popup: 'login.html'});
  } else {
    chrome.browserAction.setPopup({popup: 'main.html'});

    // If exists.. get the usr/pswd and configure ajax calls.

    var authParts = auth.split(':');
    var convrUsr = authParts[0];
    var convrPswd = authParts[1];

    setupCreds(convrUsr, convrPswd);

    var validateAccountUrl = convrBaseApiUrl + '/account/verify.json';
    $.get(validateAccountUrl, function(data) {
      if(data.error) {
        alert('Could not verify your account.');
        // Redirect to login page.
      } else {
        loadInitContent();
      }
    });
  }
}

function setupCreds(usr, pswd) {
  $.ajaxSetup({
    username: usr,
    password: pswd
  });
}

function loadInitContent() {
  setMainContent();
  var url = convrBaseApiUrl + '/groups.json';
  $.getJSON(url, function(data) {
    var groups = data.groups;
    for(var i = 0; i<groups.length; i++) {
      $('#convore-content').append( createGroupElem(groups[i]) );
    }
  });
}

function setMainContent() {
  var view = getView('main.html');
  //view.setContent('This is the content... yayyyy!');
}

function createGroupElem(group) {
  var groupElem = $('<div class="group"></div>');

  groupElem.append('<img src="' + group.creator.img + '" title="' + group.creator.username + '"/>');
  groupElem.append('<a href="javascript:void(0)" onClick="openInConvore(\'' + group.url + '\')">' + group.name + '</a>');
  groupElem.append('<span class="topic">Topics: ' + group.topics_count + '</span>');

  return groupElem;
}

function openInConvore(relativePath) {
  var url = convrUrl + relativePath;
  chrome.tabs.create({url: url}, function(tab) {});
}

function getView(htmlPage) {
  var viewTabUrl = chrome.extension.getURL(htmlPage);

  //Look through all the pages in this extension to find one we can use.
  var views = chrome.extension.getViews();
  for (var i = 0; i < views.length; i++) {
    var view = views[i];
    console.log( view + ' : ' + view.location.href );

    //If this view has the right URL and hasn't been used yet...
    if (view.location.href == viewTabUrl) {
      return view;
    }
  }
}
