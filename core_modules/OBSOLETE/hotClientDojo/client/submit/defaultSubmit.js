define( [

  "dojo/_base/declare"
, "dojo/query"
, "dojo/aspect"
, "dojo/topic"
, "dojo/_base/json"
 
, "dijit/registry"
, "dijit/Tooltip"

, "hotplate/hotClientDojo/logger/logger"

],function(

  declare
, query
, aspect
, topic
, json

, registry
, Tooltip

, logger

){

  var r = {}

  r.defaultSubmit = function(form, button, callback){

    return function(e){

      // Prevent the default
      e.preventDefault();

      // Make the button busy (if it is a busy button)
      if( button && typeof(button.makeReallyBusy) === 'function' ) button.makeReallyBusy();

      // Validate the form
      form.validate();
      
      if(! form.isValid() ){
        logger("Didn't validate, cancelling");
        if( button && typeof(button.cancel) === 'function') button.cancel();
      } else {

        // Call the callback
        callback();

        // Prevent form submission (it will be submitted through Ajax)
        return false;
      }

    }
  }


  r.UIMsg = function( button, alertBar, message ){

    return function(res){

      typeof(button) !== 'undefined'   && button   != null ? button.cancel() : null;
      typeof(alertBar) !== 'undefined' && alertBar != null ? alertBar.set('message', message) : null;
      typeof(alertBar) !== 'undefined' && alertBar != null ? alertBar.show(2000) : null;

      return res;
    }
  }

  // Function to show error messages on JsonRest put() and post() calls
  //
  r.UIErrorMsg = function( form, button, alertBar, noLogin ){

      // AJAX JsonRest failure: set error messages etc. and rethrow
      return function(err){

        var res;

        // The response hasn't been parsed yet -- get it from err.responseText
        res = hotGetResponseTextFromError(err);

        // Normalise the response as always
        res = hotFixErrorResponse(res);

        if( err.response.status != 422 && alertBar ) {
          alertBar.set('message','Submission failed!');
          alertBar.show();
        }

        switch(err.response.status){

          // ValidationError
          case 422:

            // ***********************************************
            // WATCH OUT: RESPONSE FROM THE SERVER WAS "ERROR"
            // ***********************************************

            // This array will contain the list of widgets for which the server
            // didn't like values, but didn't enforce a change before re-submitting
            var artificialErrorWidgets = [];

            // There is a message: display it
            if( res.message && alertBar ){
              alertBar.set('message','Error: ' + res.message );
              alertBar.show(); // Persistent
            }

            res.errors.forEach( function(error){
    
              // This cannot really happen anymore, FIXME: DELETEME
              if( error.field == ''){
              } else {


                // Get the widget by its name. 
                var field = query("form#"+form.id+" [name='" + error.field + "']");
                //if( ! field.length ) field = query("form#"+form.id+" textarea[name='" + error.field + "']");
                //if( ! field.length ) field = query("form#"+form.id+" div[name='" + error.field + "']");


                if(field.length && field[0].id && (widget = registry.byId( field[0].id ) ) ){

                  // Add a validator around it if the error is "persistent" (the client
                  // never wants that value again)
                  if(error.mustChange){

                    // Create a new badValue variable which contains the "bad apple"
                    var badValue = widget.get('value');
  
                    // Use Dojo aspects to add an extra check to the original widget's
                    // validation function, so that the client will never ever serve
                    // that function again
                    aspect.around(widget, 'validator', function(originalValidator){
                      return function(value){
                        if( value == badValue){
                          this.invalidMessage = error.message;
                          return false;
                        } else {
                          return originalValidator.call(this, value);
                        }
                      };
                    });

 
                  } else {

                    // Populates the array containing widgets for which an error will
                    // be raised artificially (not persistent) AFTER validation is forced
                    // (see below)
                    artificialErrorWidgets.push( { widget: widget, message: error.message }); 
                  }

                } else {
                  logger("Widget not found: " + error.field);
                }

              }

            });                      

            // Now that we might possibly have more validators attached,
            // get the form to validate again
            form.validate();

            // Artificially (VERY artificially) get the error to show. This is not due to
            // validation, so as soon as the focus is there, it will disappear
            artificialErrorWidgets.forEach(function(w){ 
              widget = w.widget;
              message = w.message;
              widget.set('state','Error')
              Tooltip.show(message, widget.domNode, widget.tooltipPosition, !widget.isLeftToRight());
            });

            // Cancel the submit button
            button ? button.cancel() : null;

            logger("Response came back with validation errors: " + json.toJson(res.errors) );

            // Rethrow
            throw(err);
          break;   

          case 401:

            // Only show the alert and the problems if the noLogin flag is false. This flag is basically for
            // the login form and the recoverPassword form and for the workspace form


            // Show the error at application level
            topic.publish('globalAlert', 'Authentication problem: ' + res.message, 5000);

            if(! noLogin){

              // Show the form to retype the password
              topic.publish( 'hotClientDojo/auth/unauthorized' );
            }

            // Cancel the submit button
            button ? button.cancel() : null;

            logger("Response came back with error 401: " + res.message);

            // Rethrow
            throw(err);
 
          break;

          // Unauthorized
          case 403:
            topic.publish('globalAlert', 'Forbidden: ' + res.message, 5000);
            topic.publish('hotClientDojo/auth/forbidden');

            // Cancel the submit button
            button ? button.cancel() : null;
            logger("Response came back with error 403: " + res.message);

          break;

          // Other errors
          default:

            // The user will see:
            // * message. It will be either res.message (if available) or err.message (as a fallback)
            // * status. It will be either err.status (the HTTP error code) or 'none' (as a fallback, e.g. timeouts)
            var message = res.message == '' ? err.message : res.message;
            var statusString = typeof(err.response.status) === 'undefined' || err.response.status == 0 ? '' : ' Status: ' + err.status;

            
            // Show the error at application level
            topic.publish( 'globalAlert', 'Application error: ' + message + statusString, 5000 );

            // Cancel the submit button
            button ? button.cancel() : null;

            logger("Respose came back with error: " + message + ' Status: ' + err.response.status );

          break;

        }

        // Rethrow
        throw(err);

      }

  };


  return r;
});


         // if(! res){

          // ***************************************
          // BAD: RESPONSE FROM THE SERVER WAS EMPTY
          // This happens on connection refused
          // ***************************************

          // Cancel the submit button
          // if( button && typeof( button.cancel ) === 'function' ) button.cancel();

          // topic.publish('globalAlert', 'Empty result from server', 5000);

          // logger("Got an empty result from ajax call");
          // throw(new Error("Empty result from ajax call"));

        // } else {

          // ***************************************
          // GOOD: RESPONSE RECEIVED, AND NO ERRORS
          // ***************************************

 
