// Hoodie.PersonaAccount
// =====================

// The future is here:
// https://developer.mozilla.org/en-US/docs/Mozilla/Persona
//

Hoodie.PersonaAccount  = (function (navigator) {

  'use strict';

  function PersonaAccount(account) {
    this.account = account;
    this.hoodie = account.hoodie;

    this._handlePopupCallback = this._handlePopupCallback.bind(this);
  }

  // 
  // 
  // 
  PersonaAccount.prototype.signIn = function() {
    // Probably we can do something useful here, but I don't know what.
    if (this.account.hasAnonymousAccount()) {
      return this.hoodie.rejectWith({
        error: 'cant be used with anonymous account'
      });
    }

    // 
    if (this.account.hasAccount()) {
      return this.hoodie.rejectWith({
        error: 'you have to sign out first'
      }).promise();
    }

    // This pops up the Persona login dialog.
    navigator.id.get( this._handlePopupCallback.bind(this) );

    // return promise to be resolved / rejected in _handlePopupCallback
    this.result = this.hoodie.defer();
    return this.result.promise();
  };


  // 
  // 
  // 
  PersonaAccount.prototype._handlePopupCallback = function(assertion) {

    if (!assertion) {
      return this.result.reject('signin cancelled');
    }

    this.assertion = assertion;
    this._submitAssertion();
  };


  // Submit the assertion to /_browserid.
  // This will log us in as well as produce some info about the user.
  // 
  PersonaAccount.prototype._submitAssertion = function() {
    var options = {
      data: JSON.stringify({ assertion: this.assertion }),
      contentType: 'application/json'
    };

    this.account.request('POST', '/_browserid', options)
    .then( this._handleAssertionSubmitSuccess.bind(this), this._handleAssertionSubmitError.bind(this) );
  };


  // 
  // 
  // 
  PersonaAccount.prototype._handleAssertionSubmitError = function(errorMessage) {
    this.result.reject('login failed; ' + errorMessage);
  };


  // 
  // 
  // 
  PersonaAccount.prototype._handleAssertionSubmitSuccess = function(response) {

    this.username = response.email;

    // If this is the first time the server has seen that user, it
    // will have created a stub _users document.  We need to fill in
    // all the extra hoodie goodies.
    this.account.fetch(this.username)
    .then( this._handleAccountVerificationSuccess.bind(this), this._handleAccountVerificationError.bind(this) );
  };


  // 
  // 
  // 
  PersonaAccount.prototype._handleAccountVerificationError = function(errorMessage) {
    this.result.reject('could not get user doc; ' + errorMessage);
  };


  // 
  // 
  // 
  PersonaAccount.prototype._handleAccountVerificationSuccess = function(response) {

    // The _users document is incomplete, fill in missing details.
    // that will resubmit the assertion
    if (! response.ownerHash) {
      this._ammendUserAccount(response);
      return;
    }

    this._waitForConfirmation().then( this.result.resolve, this.result.reject);
  };


  // 
  // 
  // 
  PersonaAccount.prototype._ammendUserAccount = function (response) {
    var options = {
      data: JSON.stringify({
        _id: this.account._key(this.username),
        _rev: response._rev,
        name: this.account._userKey(this.username),
        type: 'user',
        roles: response.roles,
        ownerHash: this.account.ownerHash,
        database: this.account.db(),
        updatedAt: this.account._now(),
        createdAt: this.account._now(),
        signedUpAt: this.username !== this.account.ownerHash ? this.account._now() : void 0
      }),
      contentType: 'application/json'
    };

    this.account.request('PUT', this.account._url(this.username), options)
    .then( this._handleUserAccountAmendmentSuccess.bind(this), this._handleUserAccountAmendmentError.bind(this) );
  };


  // 
  // 
  // 
  PersonaAccount.prototype._handleUserAccountAmendmentError = function(errorMessage) {
    this.result.reject('could not update user doc; ' + errorMessage);
  };


  // 
  // 
  // 
  PersonaAccount.prototype._handleUserAccountAmendmentSuccess = function() {
    this.account.trigger('signup', this.username);
    this._submitAssertion();
  };


  // 
  // 
  // 
  PersonaAccount.prototype._waitForConfirmation = function(defer) {

    if (!defer) {
      defer = this.hoodie.defer();
    }

    window.setTimeout(this._checkUserAccountStatus(defer), 300);
    return defer.promise();
  };


  // fetch the user account doc from /_users and check if
  // the account has been confirmed yet. If yes, resolvet
  // the passed defer, otherwise check again with `_waitForConfirmation`
  // 
  PersonaAccount.prototype._checkUserAccountStatus = function(defer) {
    return function() {
      this.account.fetch(this.username)
      .then( this.account._handleSignInSuccess() )
      .then( defer.resolve, this._checkForUnconfirmedError(defer) );
    }.bind(this);
  };


  // this method pipes the error from Hoodie to check if the reasons
  // is that the account is not confirmed yet. If that's the case,
  // restart the `_waitForConfirmation` timeout, otherwise reject 
  // the passed defer
  //
  PersonaAccount.prototype._checkForUnconfirmedError = function(defer) {
    return function(error) {
      if (error.error === 'unconfirmed') {
        return this._waitForConfirmation(defer);
      } else {
        return defer.reject.apply(defer, arguments);
      }
    }.bind(this);
  };

  return PersonaAccount;
})(navigator);