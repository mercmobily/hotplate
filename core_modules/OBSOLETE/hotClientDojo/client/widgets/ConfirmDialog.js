define( [

  "dojo/_base/declare"
, "dijit/form/Button"
, "dijit/Dialog"

], function(

  declare
, Button
, Dialog

){

  return declare( [ Dialog ], {
    cancelButton: true,
    declineOnHide: true,

    startup: function(){
      this.inherited(arguments);
      this.show();
    },

    // Hiding this widget will destroy it. This widget is good for disposable dialogs
    hide: function(){

      var self = this;
      var p = self.inherited(arguments);

      if( self.declineOnHide ){
        self.emit('dialogdeclined', { bubbles: false } );
      }
      // Attach a new callback triggered when the animation is over:
      // the callback will destroy the widget
      p.then( function(){
        self.destroyRecursive();
      });

    },

    postCreate: function(){
      var self = this;
      this.inherited(arguments);

      // Create the OK button, add them as children of dialog
      this.okButton = new Button( { label: "OK", className: "dialog-ok" } );
      this.addChild( this.okButton );
      
      // Emit the right events based on what button was clicked
      this.okButton.on('click', function(e){
        self.emit('dialogconfirmed', { bubbles: false } );
        self.declineOnHide = false;
        self.hide();
      });

      // Do the same thing with the cancel button
      if( this.cancelButton ){
        this.cancelButton = new Button( { label: "Cancel", className: 'dialog-cancel' } );
        this.addChild( this.cancelButton );

        this.cancelButton.on('click', function(e){
          self.hide();
        });
      }
    },
  });

});

