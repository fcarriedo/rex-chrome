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
  var liveCursor = null;

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
      $.ajax({
        url: url,
        dataType: 'json',
        data: {cursor: self.liveCursor},
        success: function(data) {
          if( data && data.messages ) {
            var msgsLength = data.messages.length;
            if( msgsLength > 0 ) {
              self.liveCursor = data.messages[msgsLength-1]._id // TODO(fcarriedo): Check if best to grab the last elem _id.
            }

            // Perform the callback.
            callback.call(this, data.messages);
          }
          // Calls itself again ad infinitum. (Long polling encouraged [see api docs]).
          // Reconnects as fast as the browser allows.
          setTimeout( function() { self.listenToLiveFeed(callback); }, 0 );
        },
        error: function( xmlHttpRequest ) {
          self.liveCursor = null; // TODO(fcarriedo): We should set it to null on an errorCode basis.
          setTimeout( function() { self.listenToLiveFeed(callback); }, 3000 ); // We try again after 3 seconds.
        }
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

  // https://convore.com/api/#group-mark-read
  // Mark all messages in the group as read.
  self.markGroupAllRead = function( groupId , callback ) {
    var url = convoreApiUrl + '/groups/' + groupId + '/mark_read.json';
    $.post(url, function(data) {
      callback.call( this , data );
    });
  }

  self.fetchTopicMessages = function( topicId , callback ) {
    var url = convoreApiUrl + '/topics/' + topicId + '/messages.json';
    $.getJSON(url, function(data) {
      callback.call(this, data.messages );
    });
  }

  // https://convore.com/api/#topic-mark-read
  // Mark all messages in a topic as read.
  self.markTopicAllRead = function( topicId , callback ) {
    var url = convoreApiUrl + '/topics/' + topicId + '/mark_read.json';
    $.post(url, function(data) {
      callback.call( this , data );
    });
  }

  // https://convore.com/api/#messages
  // Gets a list of direct message conversations for the current user.
  // 
  // TODO(fcarriedo): Mmmm naming kind of inconsistent (are they private
  // messages or conversations or just plain messages?) Rename.
  self.fetchPrivateConversations = function( callback ) {
    var url = convoreApiUrl + '/messages.json';
    $.getJSON(url, function(data) {
      callback.call(this, data.conversations );
    });
  }

  self.fetchMentions = function( callback ) {
    var url = convoreApiUrl + '/account/mentions.json';
    $.getJSON(url, function(data) {
      callback.call(this, data.unread , data.mentions );
    });
  }

  self.postMessage = function( topicId , message , callback ) {
    var url = convoreApiUrl + '/topics/' + topicId + '/messages/create.json';
    $.post(url, {message: message}, function(data) {
      callback.call( this , data.message );
    });
  }

  self.createNewGroup = function( newGroup , callback ) {
    var url = convoreApiUrl + '/groups/create.json';
    $.post(url, {name: newGroup.name, kind: newGroup.kind }, function(data) {
      callback.call( this , data.group );
    });
  }

  self.createNewTopic = function( groupId , newTopic , callback ) {
    var url = convoreApiUrl + '/groups/' + groupId + '/topics/create.json';
    $.post(url, {name: newTopic.name}, function(data) {
      callback.call( this , data.topic );
    });
  }

  self.starMessage = function( msgId , callback ) {
    var url = convoreApiUrl + '/messages/' + msgId + '/star.json';
    $.post(url, function(data) {
      callback.call( this , data );
    });
  }
}
