// TODO(fcarriedo): Find a sensible solution to 'same origin policy'
// other than jQuery's '?callback=?'. See how the twitter JS libraries
// are doing it. (Maybe the '?callback=?' is a sensible solution.
// See: http://en.wikipedia.org/wiki/Same_origin_policy

function ConvoreAPI( authCxt ) {
  // To guard against calls without 'new'
  if( !(this instanceof arguments.callee) ) {
    return new arguments.callee(arguments);
  }

  var convoreApiUrl = 'https://convore.com/api';

  var self = this;

  var settings = {
    authUsr: '',
    authPswd: '',
    onAuthError: null
  };

  // TODO: Do something like jQuery plugin 'extend'
  settings.authUsr = authCxt.username;
  settings.authPswd = authCxt.password;
  settings.onAuthError = authCxt.onAuthError;

  $.ajaxSetup({
    username: settings.authUsr,
    password: settings.authPswd
  });

  /*
  * Use this method to check if the user is properly logged in.
  * If successfuly verified, 'onSuccessCallback' will receive the
  * logged in user details.
  */
  self.verifyAccount = function(onSuccessCallback, onErrorCallback) {
    var verifyAccountUrl = convoreApiUrl + '/account/verify.json';
    $.ajax({
      url: verifyAccountUrl,
      username: settings.authUsr,
      password: settings.authPswd,
      success: function(data) {
        if( !data.error ) {
          if(onSuccessCallback) {
            onSuccessCallback.call(this, data);
          }
        } else {
          if(onErrorCallback) {
            onErrorCallback.call(this, data);
          }
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        if(onErrorCallback) {
          onErrorCallback.call(this, errorThrown);
        } else if(settings.onAuthError) {
          settings.onAuthError.call();
        }
        console.log('error: ' + errorThrown);
      }
    });
  }

  self.listenToLiveFeed = function( callback ) {
    var url = convoreApiUrl + '/live.json';
    setTimeout(function() {  // For non-blocknig the first time since long polls.
      $.getJSON(url, function(data) {
        callback.call(this, data.messages);
        // Calls itself again ad infinitum. (Long polling encouraged [see api docs]).
        // Reconnects as fast as the browser allows.
        setTimeout( function() { self.listenToLiveFeed(callback); }, 0 ); 
      });
    }, 0);
  }

  self.fetchGroups = function( callback ) {
    var url = convoreApiUrl + '/groups.json';
    $.getJSON(url, function(data) {
      callback.call(this, data.groups );
    });
  }

  self.fetchGroupTopics = function( groupId , callback ) {
    var url = convoreApiUrl + '/groups/' + groupId + '/topics.json';
    $.getJSON(url, function(data) {
      callback.call(this, data.topics );
    });
  }

  self.fetchTopicMessages = function( topicId , callback ) {
    var url = convoreApiUrl + '/topics/' + topicId + '/messages.json';
    $.getJSON(url, function(data) {
      callback.call(this, data.messages );
    });
  }

  self.fetchConversations = function( callback ) {
    var url = convoreApiUrl + '/topics/' + topicId + '/messages.json';
    $.getJSON(url, function(data) {
      callback.call(this, data.messages );
    });
  }

  self.fetchMentions = function( callback ) {
    var url = convoreApiUrl + '/account/mentions.json';
    $.getJSON(url, function(data) {
      callback.call(this, data.mentions, data.unread );
    });
  }
}
