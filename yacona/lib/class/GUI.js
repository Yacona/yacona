// --- Modules --- //

const moduleLoader = require( '../support/moduleLoader' )

const utility = moduleLoader( 'utility' )

// --- Functions --- //

const debug = message => {
  return utility.debug( 'green', 'gui', message )
}

// --- Store : Declare private member and method --- //

const store = new WeakMap()

// --- GUI Class --- //

class GUI {

  constructor( prefix ){
    prefix = prefix || null

    const electron = ( process.title.split( /\\|\// ).pop().toLowerCase() === 'electron' )
                       ? require( 'electron' )
                       : null


    const app = electron !== null ? electron.app : null

    store.set( this, {
      electron: electron,
      prefix  : prefix,
      all     : [],
      app     : app
    } )
  }

  createWindow( options ){
    options = options || {}

    const self = store.get( this )

    return new Promise( ( resolve, reject ) => {

      if( self.electron === null )
        reject( null )

      const BrowserWindow = self.electron.BrowserWindow

      self.app.on( 'ready', () => {
        options.show = false
        let main = new BrowserWindow( options )
        main.prefix = self.prefix

        main.once( 'ready-to-show', () => main.show() )

        self.all.push( main )

        debug( 'Create new window' )
        resolve( main )
      } )
    } )
  }

  getAllWindow(){
    return store.get( this ).all
  }

  getApp(){
    return store.get( this ).app
  }

}

// --- Sample --- //

/*
const sample = new GUI( 'sample' )

sample.app.on( 'window-all-closed', () => {
  console.log( 'Window all closed !' )
  sample.app.quit()
} )

sample.createWindow( {
  width : 200,
  height: 100
} ).then( main => {
  main.loadURL( 'http://www.google.com' )
  console.log( sample.getAllWindow() )
} )
*/

module.exports.GUI = GUI
