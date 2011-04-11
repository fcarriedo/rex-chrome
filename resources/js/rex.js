var convrBaseApiUrl = 'https://convore.com/api';
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
      $('#convore-content').append('<div class="group">' + groups[i].name + '</div>');
    }
  });
}
