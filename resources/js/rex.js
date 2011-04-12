var convrBaseApiUrl = 'https://convore.com/api';
var convrUrl = 'https://convore.com';

var convrUsr = 'fcarriedo';
var convrPswd = 'cahf79';


function initRex() {
  // If auth creds not in local storage... login page and store.
  $.ajaxSetup({
    username: convrUsr,
    password: convrPswd
  });

  // Then load init page.
  loadInitContent();
}

function loadInitContent() {
  var url = convrBaseApiUrl + '/groups.json';
  $.getJSON(url, function(data) {
    var groups = data.groups;
    for(var i = 0; i<groups.length; i++) {
      $('#convore-content').append( createGroupElem(groups[i]) );
    }
  });
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
